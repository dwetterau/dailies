"use client";

import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntityType } from "@/convex/entities";
import { assert } from "@/lib/utils";
import { SelectMenu } from "@/components/ui/select";

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
          <SelectMenu
            choices={Object.values(EntityType)}
            currentChoice={newEntityType ?? undefined}
            buttonText={"Select a type"}
            onSelect={(newValue: string) =>
              setNewEntityType(newValue as EntityType)
            }
          />
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
            <div key={e._id} className="p-4 border-b">
              {e.name} - Created by: {e.ownerId}
            </div>
          ))}
        </ol>
      )}
    </>
  );
}
