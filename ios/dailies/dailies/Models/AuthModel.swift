//
//  AuthModel.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import Auth0
import Combine
import ConvexMobile
import Observation
import Sentry
import SwiftUI

func onSuccessfulLogin(source: String) {
    print("Successfully logged in (from \(source)")
    setupReminderNotification()
}

@Observable class AuthModel {
    var authState: AuthState<Credentials> = .loading
    private var cancellables = Set<AnyCancellable>()

    func start(afterAuthentication: @escaping () -> Void) {
        print("starting authentication")
        client.authState.replaceError(with: .unauthenticated)
            .handleEvents(receiveOutput: {
                print("authState: receiveOutput", $0)
            }, receiveCompletion: logCompletionHandlers("authState"))
            .receive(on: DispatchQueue.main)
            .sink { [weak self] newAuthState in
                print("Got auth state", newAuthState)
                self?.authState = newAuthState
                afterAuthentication()
            }
            .store(in: &cancellables)
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
                    SentrySDK.capture(error: error)
                }
            }
        }
    }

    public func logTokenForDebugging() {
        let breadcrumb = Breadcrumb(level: .info, category: "custom")
        breadcrumb.message = "auth state"

        if case let .authenticated(creds) = authState {
            breadcrumb.data = ["token": authState, "idToken": creds.idToken, "refreshToken": creds.refreshToken ?? "none", "accessToken": creds.accessToken, "expiresIn": creds.expiresIn]

        } else {
            breadcrumb.data = ["token": authState]
        }
        SentrySDK.addBreadcrumb(breadcrumb)
        SentrySDK.capture(error: NSError(domain: "FakeAuthError", code: 123, userInfo: [NSLocalizedDescriptionKey: "See breadcrumbs"]))
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
            } catch {
                handleMutationError(error)
            }
        }
    }
}
