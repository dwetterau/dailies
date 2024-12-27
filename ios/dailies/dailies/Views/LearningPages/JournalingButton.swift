//
//  JournalingButton.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import SwiftUI

struct JournalingButton: View {
    @StateObject var viewModel: EntityCompletionModel

    init(entityId: String) {
        _viewModel = StateObject(wrappedValue: EntityCompletionModel(
            entityId: entityId,
            // TODO: read this quantity from the entity
            numRequiredCompletions: 1
        ))
    }

    var body: some View {
        Button(action: {
            viewModel.logCompletion()
        }) {
            BigButton(
                // TODO: Get the button text from the entity
                buttonText: viewModel.isComplete ? "Journal -  \(viewModel.completionStatusString)" : "Journal",
                buttonCompleteColor: .green,
                isComplete: viewModel.isComplete
            )
        }.disabled(viewModel.isComplete || viewModel.isSaving)
    }
}
