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

    var body: some View {
            ZStack {
                // Background progress bar
                GeometryReader { geometry in
                    HStack(spacing: 0) {
                        buttonCompleteColor
                            .frame(width: geometry.size.width * completionRatio)
                        
                        Color.gray
                            .frame(width: geometry.size.width * (1 - completionRatio))
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
        }
}
