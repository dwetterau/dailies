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

func onSuccessfulLogin(source: String) {
    print("Successfully logged in (from \(source)")
    setupReminderNotification()
}

class AuthModel: ObservableObject {
    @Published var authState: AuthState<Credentials> = .loading

    init() {
        client.authState.replaceError(with: .unauthenticated)
            .handleEvents(receiveOutput: {
                print("authState: receiveOutput", $0)
            }, receiveCompletion: logCompletionHandlers("authState"))
            .receive(on: DispatchQueue.main)
            .assign(to: &$authState)
        Task {
            let result = await client.loginFromCache()
            switch result {
            case .success:
                onSuccessfulLogin(source: "cache")
            case let .failure(error):
                if error as? CredentialsManagerError == CredentialsManagerError.noCredentials {
                    print("No credentials in store found.")
                } else {
                    print("Other error: \(error)")
                }
            }
        }
    }

    func logout() {
        Task {
            await client.logout()
        }
    }

    func login() {
        Task {
            let result = await client.login()
            switch result {
            case .success:
                onSuccessfulLogin(source: "explicit")
            case let .failure(error):
                print("An unknown error occurred while trying to login \(error)")
            }

            do {
                try await client.mutation("users:store")
            } catch let ClientError.ConvexError(data) {
                let errorMessage = try! JSONDecoder().decode(String.self, from: Data(data.utf8))
                print(errorMessage)
            } catch {
                print("An unknown error occurred: \(error)")
            }
        }
    }
}
