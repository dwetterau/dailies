//
//  dailiesApp.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import ConvexAuth0
import ConvexMobile
import SwiftUI
import SwiftUIRouter

let client = ConvexClientWithAuth(deploymentUrl: deploymentUrl, authProvider: Auth0Provider(enableCachedLogins: true))

@main
struct dailiesApp: App {
    @StateObject private var navigator = Navigator()
    
    var body: some Scene {
        WindowGroup {
            LandingPage().environmentObject(navigator)
        }
    }
}
