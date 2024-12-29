//
//  LearningPage.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import SwiftUI

struct LearningPage: View {
    @ObservedObject var entityListModel: EntityListModel
    @StateObject var categoryPageModel: CategoryPageModel

    init(entityListModel: EntityListModel) {
        self.entityListModel = entityListModel
        _categoryPageModel = StateObject(wrappedValue: CategoryPageModel(
            .learning,
            entityListModel: entityListModel
        ))
    }

    var body: some View {
        VStack(spacing: 20) {
            if let flashCardsEntityId = categoryPageModel.getEntityIdForType(.flashCards) {
                let buttonText = entityListModel.getEntity(id: flashCardsEntityId)?.name ?? "Flash cards"
                NavigationLink(value: "flashCards") {
                    BigButton(
                        buttonText: buttonText,
                        buttonCompleteColor: getColorForEntityCategory(.learning),
                        completionRatio: entityListModel.getCompletionRatio(for: flashCardsEntityId)
                    )
                }
            }
            if let journalingEntity = entityListModel.getEntity(id: categoryPageModel.getEntityIdForType(.journaling)) {
                EntityCompletionButton(journalingEntity)
            }
            if let duolingoEntity = entityListModel.getEntity(id: categoryPageModel.getEntityIdForType(.duolingo)) {
                EntityCompletionButton(duolingoEntity)
            }
        }.navigationTitle("Learning")
            .navigationDestination(for: String.self) { destination in
                switch destination {
                case "flashCards":
                    if let flashCardsEntityId = categoryPageModel.getEntityIdForType(.flashCards) {
                        FlashCardReviewPage(flashCardsEntityId)
                    } else {
                        Text("no flash card entity")
                    }
                default: Text("unknown destination")
                }
            }
    }
}
