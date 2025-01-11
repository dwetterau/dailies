//
//  NotificationModel.swift
//  Dailies (dev)
//
//  Created by David Wetterau on 1/10/25.
//

import AlertToast
import SwiftUI

class NotificationModel: ObservableObject {
    @Published
    var shouldShowAllCompleteToast: Bool = false

    public let allCompleteToast: AlertToast = .init(type: .complete(.green), title: "All done!")

    func setShouldShowAllCompleteToast(_ shouldShowAllCompleteToast: Bool) {
        print("Updating  setShouldShowAllCompleteToast", shouldShowAllCompleteToast)
        self.shouldShowAllCompleteToast = shouldShowAllCompleteToast
    }
}
