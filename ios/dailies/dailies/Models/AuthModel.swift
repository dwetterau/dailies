//
//  AuthModel.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import Auth0
import Combine
import ConvexMobile
import SwiftUI

class AuthModel: ObservableObject {
    @Published var authState: AuthState<Credentials> = .loading
    
    init() {
        client.authState.replaceError(with: .unauthenticated)
            .receive(on: DispatchQueue.main)
            .assign(to: &$authState)
         Task {
            await client.loginFromCache()
        }
    }
    
    func login() {
        Task {
            await client.login()
        }
    }
}