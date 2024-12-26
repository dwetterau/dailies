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
                    if let flashCardEntityId = entityListModel.getFlashCardEntityId() {
                        NavigationLink(value: "flashCards") {
                            Text("Flash Cards")
                                .font(.title)
                                .frame(maxWidth: .infinity, minHeight: 60)
                                .background(entityListModel.isEntityDoneToday(entityId: flashCardEntityId) ? Color.green : Color.gray)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                                .padding(.horizontal, 30)
                                .shadow(radius: 10)
                        }
                    }
                    if let hydrationEntityId = entityListModel.getHydrationEntityId() {
                        NavigationLink(value: "hydration") {
                            Text("Drink water")
                                .font(.title)
                                .frame(maxWidth: .infinity, minHeight: 60)
                                .background(entityListModel.isEntityDoneToday(entityId: hydrationEntityId) ? Color.blue : Color.gray)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                                .padding(.horizontal, 30)
                                .shadow(radius: 10)
                        }
                    }
                    NavigationLink(value: "exercise") {
                        Text("Exercise")
                            .font(.title)
                            .frame(maxWidth: .infinity, minHeight: 60)
                            .background(Color.gray)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                            .padding(.horizontal, 30)
                            .shadow(radius: 10)
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
                    case "flashCards":
                        if let entityId = entityListModel.getFlashCardEntityId() {
                            FlashCardReviewPage(entityId: entityId)
                        } else {
                            Text("Missing flash card entity")
                        }
                    case "hydration":
                        if let entityId = entityListModel.getHydrationEntityId() {
                            HydrationPage(entityId: entityId)
                        } else {
                            Text("Missing hydration entity")
                        }
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
