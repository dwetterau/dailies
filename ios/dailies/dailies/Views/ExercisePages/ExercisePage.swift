//
//  ExercisePage.swift
//  dailies
//
//  Created by David Wetterau on 12/27/24.
//

import SwiftUI

struct ExercisePage: View {
    @ObservedObject var entityListModel: EntityListModel

    var body: some View {
        VStack(spacing: 20) {
            ForEach(entityListModel.getEntities(forCategory: .exercise), id: \.id) { entityViewModel in
                if entityViewModel.type == .workoutMachineWithWeight {
                    NavigationLink(value: entityViewModel.id) {
                        BigButton(
                            buttonText: entityViewModel.name,
                            buttonCompleteColor: entityViewModel.buttonColor,
                            completionRatio: entityListModel.getCompletionRatio(for: entityViewModel.id)
                        )
                    }
                } else {
                    Text("unknown entity")
                }
            }
        }.navigationTitle("Exercise")
            .navigationDestination(for: String.self) { entityId in
                if let entityViewModel = entityListModel.getEntity(id: entityId) {
                    if entityViewModel.type == .workoutMachineWithWeight {
                        WorkoutMachineWithWeightPage(entityId: entityViewModel.id)
                    } else {
                        Text("unknown exercise entity destination")
                    }
                } else {
                    Text("unknown exercise entity")
                }
            }
    }
}
