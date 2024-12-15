//
//  LandingPage.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import SwiftUI

struct LandingPage: View {
    @StateObject var authModel = AuthModel()
    
    var body: some View {
        Color.white.ignoresSafeArea().overlay{
            Group {
                switch authModel.authState {
                case .loading:
                    ProgressView()
                case .unauthenticated:
                    VStack {
                        Text("Dailies").font(.largeTitle)
                        Button(action: authModel.login) {
                            Text("Login").font(.title)
                        }
                    }.padding()
                case .authenticated(_):
                    NavigationStack {
                        EntityListPage()
                    }
                }
            }
        }
    }
}

#Preview {
    LandingPage()
}
