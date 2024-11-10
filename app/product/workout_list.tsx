"use client";

import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityType } from "@/convex/entities";
import { assert } from "@/lib/utils";

export function WorkoutList({ viewer }: { viewer: Id<"users"> }) {
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityType, setNewEntityType] = useState<null | EntityType>(null);
  const entities = useQuery(api.entities.list);
  const createEntity = useMutation(api.entities.create);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    assert(newEntityType);
    createEntity({ name: newEntityName, type: newEntityType }).catch(
      (error) => {
        console.error("Failed to send message:", error);
      }
    );
    setNewEntityName("");
  };

  return (
    <>
      <div className="border-b">
        <form onSubmit={handleSubmit} className="flex gap-2 p-4">
          <Input
            value={newEntityName}
            onChange={(event) => setNewEntityName(event.target.value)}
            placeholder="New entity name…"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">Change type</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.values(EntityType).map((type) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => setNewEntityType(type)}
                >
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="submit"
            disabled={newEntityName === "" && newEntityType !== null}
          >
            Create
          </Button>
        </form>
      </div>
      {entities && (
        <ol>
          {entities.entities.map((e) => (
            <div className="p-4 border-b">
              {e.name} - Created by: {e.ownerId}
            </div>
          ))}
        </ol>
      )}
    </>
  );
}
