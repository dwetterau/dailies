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
    let isComplete: Bool

    var body: some View {
        Text(buttonText)
            .font(.title)
            .frame(maxWidth: .infinity, minHeight: 60)
            .background(isComplete ? buttonCompleteColor : Color.gray)
            .foregroundColor(.white)
            .cornerRadius(12)
            .padding(.horizontal, 30)
            .shadow(radius: 10)
    }
}
