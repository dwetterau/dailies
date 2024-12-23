//
//  HomePage.swift
//  dailes dev
//
//  Created by David Wetterau on 12/22/24.
//

import SwiftUI

struct HomePage: View {
    var body: some View {
        VStack{
            NavigationLink(value: "workouts") {
                Text("Workouts")
            }
            NavigationLink(value: "flashCards") {
                Text("Flash Cards")
            }
        }
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
    }
}

#Preview {
    HomePage()
}
