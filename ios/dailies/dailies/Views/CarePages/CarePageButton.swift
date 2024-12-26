//
//  CarePageButton.swift
//  dailies
//
//  Created by David Wetterau on 12/26/24.
//

import SwiftUI

struct CarePageButton: View {
    @ObservedObject var entityListModel: EntityListModel

    var body: some View {
        BigButton(
            buttonText: "Care",
            buttonCompleteColor: .blue,
            isComplete: entityListModel.isCategoryDoneToday(category: .care)
        )
    }
}
