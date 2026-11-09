import Foundation
import WebKit
import UniformTypeIdentifiers

/// Serves the bundled web build ("docs" folder in the app bundle) at tesifr://app/…
/// A real origin (instead of file://) keeps localStorage, ES-module workers (POH viewer),
/// WebAssembly (logbook OCR) and audio seeking working fully offline.
final class AppSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "tesifr"
    static let startURL = URL(string: "tesifr://app/index.html")!

    private let root: URL = {
        let r = Bundle.main.resourceURL!.appendingPathComponent("docs", isDirectory: true)
        return r.standardizedFileURL
    }()

    private static let mime: [String: String] = [
        "html": "text/html; charset=utf-8", "js": "text/javascript; charset=utf-8", "mjs": "text/javascript; charset=utf-8",
        "css": "text/css; charset=utf-8", "json": "application/json", "webmanifest": "application/manifest+json",
        "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "svg": "image/svg+xml", "webp": "image/webp",
        "mp3": "audio/mpeg", "m4a": "audio/mp4", "mp4": "video/mp4", "wasm": "application/wasm", "pdf": "application/pdf",
        "txt": "text/plain; charset=utf-8", "gz": "application/gzip", "traineddata": "application/octet-stream"
    ]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard file.path.hasPrefix(root.path),
              let data = try? Data(contentsOf: file, options: .mappedIfSafe) else {
            let r = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1",
                                    headerFields: ["Content-Type": "text/plain", "Access-Control-Allow-Origin": "*"])!
            task.didReceive(r); task.didReceive(Data("Not found".utf8)); task.didFinish()
            return
        }
        let ext = file.pathExtension.lowercased()
        let type = Self.mime[ext] ?? UTType(filenameExtension: ext)?.preferredMIMEType ?? "application/octet-stream"
        var headers = ["Content-Type": type, "Access-Control-Allow-Origin": "*", "Accept-Ranges": "bytes", "Cache-Control": "no-cache"]

        // Byte ranges, so narration audio can seek.
        if let range = task.request.value(forHTTPHeaderField: "Range"), let r = Self.parse(range, count: data.count) {
            let (start, end) = r
            let slice = data.subdata(in: start..<(end + 1))
            headers["Content-Range"] = "bytes \(start)-\(end)/\(data.count)"
            headers["Content-Length"] = String(slice.count)
            task.didReceive(HTTPURLResponse(url: url, statusCode: 206, httpVersion: "HTTP/1.1", headerFields: headers)!)
            task.didReceive(slice)
        } else {
            headers["Content-Length"] = String(data.count)
            task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!)
            task.didReceive(data)
        }
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}   // responses are synchronous

    /// "bytes=start-end" / "bytes=start-" / "bytes=-suffix"
    static func parse(_ header: String, count: Int) -> (Int, Int)? {
        guard count > 0, header.hasPrefix("bytes=") else { return nil }
        let spec = header.dropFirst(6).split(separator: ",").first.map(String.init) ?? ""
        let parts = spec.split(separator: "-", omittingEmptySubsequences: false).map(String.init)
        guard parts.count == 2 else { return nil }
        var start: Int, end: Int
        if parts[0].isEmpty {                       // suffix range
            guard let n = Int(parts[1]), n > 0 else { return nil }
            start = max(0, count - n); end = count - 1
        } else {
            guard let s = Int(parts[0]) else { return nil }
            start = s; end = Int(parts[1]) ?? (count - 1)
        }
        end = min(end, count - 1)
        guard start <= end, start < count else { return nil }
        return (start, end)
    }
}
