//
//  dailiesApp.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import ConvexAuth0
import ConvexMobile
import Sentry
import SwiftUI

let client = ConvexClientWithAuth(deploymentUrl: deploymentUrl, authProvider: Auth0Provider(enableCachedLogins: true))

@main
struct dailiesApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var landingPageModel = LandingPageModel()
    
    init() {
        SentrySDK.start { options in
            options.dsn = "https://1b2690bc4059a0b5eae495374efb3ea1@o65903.ingest.us.sentry.io/4508639119867904"
            // options.debug = true // Enabled debug when first installing is always helpful

            // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
            // We recommend adjusting this value in production.
            options.tracesSampleRate = 1.0

            // Sample rate for profiling, applied on top of TracesSampleRate.
            // We recommend adjusting this value in production.
            // options.profilesSampleRate = 1.0
        }
    }

    var body: some Scene {
        WindowGroup {
            LandingPage()
                .environmentObject(landingPageModel)
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .active {
                        Task {
                            await landingPageModel.updateHomePageModel()
                        }
                    }
                }
        }
    }
}
