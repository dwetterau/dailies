//
//  LandingPage.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import SwiftUI

struct LandingPage: View {
    @EnvironmentObject var landingPageModel: LandingPageModel

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
                    NavigationStack {
                        HomePage(authModel: landingPageModel.authModel, homePageModel: landingPageModel.homePageModel!)
                    }
                }
            }
        }
    }
}

#Preview {
    LandingPage().environmentObject(LandingPageModel())
    
}
