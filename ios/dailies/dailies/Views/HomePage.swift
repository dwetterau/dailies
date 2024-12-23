//
//  HomePage.swift
//  dailes dev
//
//  Created by David Wetterau on 12/22/24.
//

import SwiftUI

struct HomePage: View {
    var authModel: AuthModel

    init(authModel: AuthModel) {
        self.authModel = authModel
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
                    NavigationLink(value: "workouts") {
                        Text("Workouts")
                            .font(.title)
                            .frame(maxWidth: .infinity, minHeight: 60)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                            .padding(.horizontal, 30)
                            .shadow(radius: 10)
                    }

                    NavigationLink(value: "flashCards") {
                        Text("Flash Cards")
                            .font(.title)
                            .frame(maxWidth: .infinity, minHeight: 60)
                            .background(Color.green)
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
                    case "workouts":
                        EntityListPage()
                    case "flashCards":
                        FlashCardReviewPage()
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
