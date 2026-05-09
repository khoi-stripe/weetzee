import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    var shortcutAction: String?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if let shortcutItem = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem {
            shortcutAction = shortcutItem.type
        }
        return true
    }

    func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        guard let bridge = (window?.rootViewController as? CAPBridgeViewController)?.bridge else {
            completionHandler(false)
            return
        }
        let action = shortcutItem.type == "com.weetzee.app.continue" ? "continue" : "new"
        bridge.webView?.evaluateJavaScript("window.__shortcutAction = '\(action)';") { _, _ in }
        completionHandler(true)
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        if let action = shortcutAction {
            shortcutAction = nil
            guard let bridge = (window?.rootViewController as? CAPBridgeViewController)?.bridge else { return }
            let jsAction = action == "com.weetzee.app.continue" ? "continue" : "new"
            bridge.webView?.evaluateJavaScript("window.__shortcutAction = '\(jsAction)';") { _, _ in }
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
