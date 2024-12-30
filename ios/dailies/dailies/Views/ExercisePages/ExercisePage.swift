//
//  ExercisePage.swift
//  dailies
//
//  Created by David Wetterau on 12/27/24.
//

import AlertToast
import SwiftUI

struct ExercisePage: View {
    @ObservedObject var entityListModel: EntityListModel
    @State var showSaveSuccessToast = false

    var body: some View {
        VStack(spacing: 20) {
            ForEach(entityListModel.getEntities(forCategory: .exercise), id: \.id) { entityViewModel in
                switch entityViewModel.type {
                case .workout:
                    NavigationLink(value: entityViewModel.id) {
                        BigButton(
                            buttonText: entityViewModel.name,
                            buttonCompleteColor: entityViewModel.buttonColor,
                            completionRatio: entityListModel.getCompletionRatio(for: entityViewModel.id)
                        )
                    }
                case .genericCompletion:
                    EntityCompletionButton(entityViewModel)
                default:
                    Text("unknown entity type: \(entityViewModel.type)")
                }
            }
        }
        .navigationTitle("Exercise")
        .navigationDestination(for: String.self) { entityId in
            if let entityViewModel = entityListModel.getEntity(id: entityId) {
                if entityViewModel.includedEventFields != nil && entityViewModel.type == .workout {
                    WorkoutEditPage(
                        entityId: entityViewModel.id,
                        entityName: entityViewModel.name,
                        includedEventFields: entityViewModel.includedEventFields!
                    ) {
                        showSaveSuccessToast = true
                    }
                } else {
                    Text("could not navigate to exercise entity")
                }
            } else {
                Text("unknown exercise entity")
            }
        }.toast(isPresenting: $showSaveSuccessToast) {
            AlertToast(type: .complete(.green), title: "Saved!")
        }
    }
}
