"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Group {
  id: string;
  name: string;
  description: string;
  topics: string[];
  memberCount: number;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/groups")
      .then((res) => res.json())
      .then((data) => {
        setGroups(data.groups ?? []);
      })
      .catch(() => {
        setGroups([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);


  async function joinGroup(groupId: string) {
    try {
      await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
      });

      alert("Joined group successfully");

    } catch {
      alert("Failed to join group");
    }
  }


  return (
    <div className="mx-auto max-w-6xl px-6 py-12">

      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">

        <div>

          <h1 className="font-display text-4xl font-bold">
            Rage Groups
          </h1>


          <p className="mt-2 text-white/50">
            Communities built around topics. Battle, chat, and climb group
            leaderboards together.
          </p>

        </div>


        <Button size="md">
          + Create group
        </Button>


      </div>



      {loading ? (

        <p className="text-white/50">
          Loading groups...
        </p>


      ) : groups.length === 0 ? (

        <Card className="text-center">

          <p className="text-white/60">
            No groups available yet.
          </p>

        </Card>


      ) : (


        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">


          {groups.map((group) => (


            <Card
              key={group.id}
              className="flex flex-col gap-4"
            >


              <div className="h-24 rounded-xl bg-aura-gradient" />


              <div>

                <h3 className="font-display text-lg font-semibold">
                  {group.name}
                </h3>


                <p className="mt-1 text-sm text-white/50">
                  {group.description}
                </p>

              </div>



              <div className="flex flex-wrap gap-2">

                {group.topics.map((topic) => (

                  <span
                    key={topic}
                    className="rounded-full bg-white/[0.04] px-3 py-1 text-xs font-medium text-aura-purple"
                  >
                    {topic}
                  </span>

                ))}


              </div>



              <div className="mt-auto text-xs text-white/40">

                <span>
                  {group.memberCount?.toLocaleString() ?? 0} members
                </span>

              </div>



              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => joinGroup(group.id)}
              >

                Join group

              </Button>


            </Card>


          ))}


        </div>


      )}


    </div>
  );
}