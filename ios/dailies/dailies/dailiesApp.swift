//
//  dailiesApp.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import ConvexAuth0
import ConvexMobile
import SwiftUI

let client = ConvexClientWithAuth(deploymentUrl: deploymentUrl, authProvider: Auth0Provider(enableCachedLogins: true))

@main
struct dailiesApp: App {
    var body: some Scene {
        WindowGroup {
            LandingPage()
        }
    }
}
