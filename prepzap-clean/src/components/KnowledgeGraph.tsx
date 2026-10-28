import React, { useEffect, useState, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { supabase } from "@/lib/supabase";

interface Node {
  id: string;
  name: string;
  val: number;
  color?: string;
}

interface Link {
  source: string;
  target: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

export default function KnowledgeGraph({ onNodeClick }: { onNodeClick?: (noteId: string) => void }) {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: notes }, { data: links }] = await Promise.all([
        supabase.from("notes").select("id, title"),
        supabase.from("note_links").select("source_note_id, target_note_id")
      ]);

      if (notes) {
        const graphNodes = notes.map(n => ({
          id: n.id,
          name: n.title || "Untitled",
          val: 2,
          color: "#10B981"
        }));

        const graphLinks = (links || []).map(l => ({
          source: l.source_note_id,
          target: l.target_note_id
        }));

        setData({ nodes: graphNodes, links: graphLinks });
      }
    };
    fetchData();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#FAF7F2] rounded-xl border-2 border-black overflow-hidden shadow-[4px_4px_0px_#000]">
      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeLabel="name"
        nodeColor="color"
        linkColor={() => "#000000"}
        linkWidth={1.5}
        nodeRelSize={6}
        onNodeClick={(node) => {
          if (onNodeClick) onNodeClick(node.id as string);
        }}
        d3VelocityDecay={0.3}
      />
    </div>
  );
}
