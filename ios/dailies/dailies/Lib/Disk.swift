//
//  Disk.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import Foundation

func saveToDisk<T: Codable>(_ objects: T, filename: String) {
    let fileManager = FileManager.default
    guard let directory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first else {
        print("Error: Unable to access document directory")
        return
    }

    let fileURL = directory.appendingPathComponent(filename)

    do {
        let data = try JSONEncoder().encode(objects)
        try data.write(to: fileURL)
        // print("Saved data to \(fileURL)")
    } catch {
        print("Error saving data: \(error)")
    }
}

func loadFromDisk<T: Codable>(filename: String, type _: T.Type) -> T? {
    let fileManager = FileManager.default
    guard let directory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first else {
        print("Error: Unable to access document directory")
        return nil
    }

    let fileURL = directory.appendingPathComponent(filename)

    do {
        let data = try Data(contentsOf: fileURL)
        let objects = try JSONDecoder().decode(T.self, from: data)
        print("Loaded data from \(fileURL)")
        return objects
    } catch {
        print("Error loading data: \(error)")
        return nil
    }
}
