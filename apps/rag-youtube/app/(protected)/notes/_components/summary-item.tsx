import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import Link from "next/link";

type Summary = {
  id: string;
  sourceId: string;
  title: string;
  createdAt: string;
  summary: string;
};

type SummaryItemProps = {
  summary: Summary;
};

function getPreview(text: string, length = 160) {
  const stripped = text.replace(/[#>*_`~-]/g, "").trim();
  if (stripped.length <= length) {
    return stripped;
  }
  return `${stripped.slice(0, length)}…`;
}

export function SummaryItem({ summary }: SummaryItemProps) {
  return (
    <li>
      <Link className="block" href={`/notes/${summary.sourceId}`}>
        <Card className="bg-secondary/50 transition-colors hover:bg-secondary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base hover:underline">
              {summary.title}
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              {new Date(summary.createdAt).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">
              {getPreview(summary.summary)}
            </p>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
