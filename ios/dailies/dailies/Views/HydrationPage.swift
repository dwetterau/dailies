//
//  HydrationPage.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import SwiftUI

struct HydrationPage: View {
    @StateObject var viewModel: EntityCompletionModel

    init(entityId: String) {
        _viewModel = StateObject(wrappedValue: EntityCompletionModel(
            entityId: entityId,
            // TODO: read this quantity from the entity
            numRequiredCompletions: 3
        ))
    }

    var body: some View {
        VStack {
            Button(action: {
                viewModel.logCompletion(completionCallback: {})
            }) {
                Text("Drink a glass -  \(viewModel.completionStatusString)")
                    .font(.title)
                    .frame(maxWidth: .infinity, minHeight: 60)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .padding(.horizontal, 30)
                    .shadow(radius: 10)
            }.disabled(viewModel.isComplete || viewModel.isSaving)
            // TODO: Get the title from the entity
        }.navigationTitle("Drink Water")
    }
}
