//
//  ConvexHelpers.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//
import Combine
import ConvexMobile
import Sentry
import SwiftUI

func logCompletionHandlers<F: Error>(_ queryName: String) -> (Subscribers.Completion<F>) -> Void {
    return { completion in
        if case let .failure(error) = completion {
            // Log the error
            print("Convex [\(queryName)]: Error logged: \(error.localizedDescription)")
            SentrySDK.capture(error: error) { scope in
                scope.setTag(value: queryName, key: "queryName")
                scope.setTag(value: error.localizedDescription, key: "convex.localizedDescription")
            }
        } else {
            print("Convex [\(queryName)]: got response \(completion)")
        }
    }
}

func handleMutationError(_ error: Error) {
    if case let ClientError.ConvexError(data) = error {
        SentrySDK.capture(error: error) { scope in
            do {
                let errorMessage = try JSONDecoder().decode(String.self, from: Data(data.utf8))
                print(errorMessage)
                scope.setTag(value: errorMessage, key: "convexResponse")
            } catch {
                print("Couldn't parse error message")
                return
            }
        }
    } else {
        print("An unknown error occurred: \(error)")
        SentrySDK.capture(error: error)
    }
}
