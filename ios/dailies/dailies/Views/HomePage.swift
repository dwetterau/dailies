//
//  HomePage.swift
//  dailes dev
//
//  Created by David Wetterau on 12/22/24.
//

import SwiftUI

struct HomePage: View {
    @StateObject
    var entityListModel: EntityListModel
    var authModel: AuthModel

    init(authModel: AuthModel) {
        self.authModel = authModel
        _entityListModel = StateObject(wrappedValue: EntityListModel())
    }

    var body: some View {
        NavigationStack {
            VStack {
                // Title Section
                Text("Dailies")
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                    .padding(.top, 100) // Spacing from the top

                // Buttons Section
                VStack(spacing: 20) {
                    NavigationLink(value: "learningButton") {
                        LearningPageButton(entityListModel: self.entityListModel)
                    }
                    NavigationLink(value: "careButton") {
                        CarePageButton(entityListModel: self.entityListModel)
                    }
                    NavigationLink(value: "exercise") {
                        BigButton(buttonText: "Exercise", buttonCompleteColor: .purple, isComplete: false)
                    }
                    Spacer()
                    Button(action: {
                        authModel.logout()
                    }) {
                        Text("Logout")
                            .padding(.top, 20)
                    }
                }
                .padding(.top, 100) // Spacing from the top
                .navigationDestination(for: String.self) { destination in
                    switch destination {
                    case "exercise":
                        EntityListPage(entities: entityListModel.getExerciseEntities())
                    case "learningButton":
                        LearningPage(entityListModel: entityListModel)
                    case "flashCards":
                        if let flashCardsEntityId = entityListModel.getEntityId(forCategory: .learning, forType: .flashCards) {
                            FlashCardReviewPage(entityId: flashCardsEntityId)
                        } else {
                            Text("no flash card entity")
                        }
                    case "careButton":
                        CarePage(entityListModel: entityListModel)
                    default:
                        Text("Unknown destination \(destination)")
                    }
                }
                Spacer()
            }
            .padding()
            .background(Color(.systemBackground)) // Default background
            .edgesIgnoringSafeArea(.all) // To allow the background to fill the screen
        }
    }
}

#Preview {
    HomePage(authModel: AuthModel())
}
