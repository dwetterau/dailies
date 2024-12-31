//
//  CategoryButton.swift
//  dailies
//
//  Created by David Wetterau on 12/31/24.
//
import SwiftUI

struct CategoryButton: View {
    @ObservedObject
    var entityListModel: EntityListModel
    let category: EntityCategory

    init(entityListModel: EntityListModel, category: EntityCategory) {
        self.entityListModel = entityListModel
        self.category = category
    }

    var body: some View {
        BigButton(
            buttonText: category.displayName(),
            buttonCompleteColor: getColorForEntityCategory(category),
            completionRatio: entityListModel.getCategoryCompletionRatio(for: category)
        )
    }
}
