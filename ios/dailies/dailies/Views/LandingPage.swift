//
//  LandingPage.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import SwiftUI

struct LandingPage: View {
    @Environment(LandingPageModel.self) private var landingPageModel

    var body: some View {
        Color.white.ignoresSafeArea().overlay {
            Group {
                switch landingPageModel.authModel.authState {
                case .loading:
                    ProgressView()
                case .unauthenticated:
                    VStack {
                        Text("Dailies").font(.largeTitle)
                        Button(action: landingPageModel.authModel.login) {
                            Text("Login").font(.title)
                        }
                    }.padding()
                case .authenticated:
                    if let homePageModel = landingPageModel.homePageModel {
                        NavigationStack {
                            HomePage(authModel: landingPageModel.authModel, homePageModel: homePageModel)
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    LandingPage().environment(LandingPageModel())
    
}
