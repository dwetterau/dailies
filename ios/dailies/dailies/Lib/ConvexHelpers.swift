//
//  ConvexHelpers.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//
import Combine

func logCompletionHandlers<F: Error>(_ queryName: String) -> (Subscribers.Completion<F>) -> Void {
    return { completion in
        if case let .failure(error) = completion {
            // Log the error
            print("Convex [\(queryName)]: Error logged: \(error.localizedDescription)")
        } else {
            print("Convex [\(queryName)]: got response \(completion)")
        }
    }
}
