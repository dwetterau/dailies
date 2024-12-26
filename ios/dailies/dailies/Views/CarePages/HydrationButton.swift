//
//  HydrationButton.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import SwiftUI

struct HydrationButton: View {
    @StateObject var viewModel: EntityCompletionModel

    init(entityId: String) {
        _viewModel = StateObject(wrappedValue: EntityCompletionModel(
            entityId: entityId,
            // TODO: read this quantity from the entity
            numRequiredCompletions: 3
        ))
    }

    var body: some View {
        Button(action: {
            viewModel.logCompletion(completionCallback: {})
        }) {
            BigButton(
                // TODO: Get the button text from the entity
                buttonText: "Drink a glass -  \(viewModel.completionStatusString)",
                buttonCompleteColor: .blue,
                isComplete: viewModel.isComplete
            )
        }.disabled(viewModel.isComplete || viewModel.isSaving)
    }
}
