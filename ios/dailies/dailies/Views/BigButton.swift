//
//  BigButton.swift
//  dailes dev
//
//  Created by David Wetterau on 12/26/24.
//

import SwiftUI

struct BigButton: View {
    let buttonText: String
    let buttonCompleteColor: Color
    // Number in [0, 1]
    let completionRatio: CGFloat

    @State private var animatedCompletionRatio: CGFloat = 0.0

    var body: some View {
        ZStack {
            // Background progress bar
            GeometryReader { geometry in
                HStack(spacing: 0) {
                    buttonCompleteColor
                        .frame(width: geometry.size.width * animatedCompletionRatio)
                        .animation(.easeInOut(duration: 0.5), value: animatedCompletionRatio)

                    Color.gray
                        .frame(width: geometry.size.width * (1 - animatedCompletionRatio))
                        .animation(.easeInOut(duration: 0.5), value: animatedCompletionRatio)
                }
            }
            .cornerRadius(12)
            .shadow(radius: 10)

            // Button text
            Text(buttonText)
                .font(.title)
                .foregroundColor(.white)
                .padding(.horizontal, 30)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 60)
        .padding(.horizontal, 30)
        .onAppear {
            animatedCompletionRatio = completionRatio // Initialize the state variable
        }
        .onChange(of: completionRatio) { _, newValue in
            withAnimation {
                animatedCompletionRatio = newValue
            }
        }
    }
}

struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .animation(.spring(response: 0.3), value: configuration.isPressed)
    }
}
