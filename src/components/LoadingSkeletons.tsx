import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const NFTCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="aspect-square w-full" />
    <CardContent className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </CardContent>
  </Card>
);

export const CollectionCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="h-32 w-full" />
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </CardContent>
  </Card>
);

export const MarketplaceCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="aspect-square w-full" />
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
    </CardContent>
  </Card>
);

export const ProfileHeaderSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-48 w-full rounded-lg" />
    <div className="flex items-end gap-4 -mt-12 px-4">
      <Skeleton className="h-24 w-24 rounded-full border-4 border-background" />
      <div className="flex-1 space-y-2 pb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-10 w-28 rounded-md" />
    </div>
  </div>
);

export const StreamCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="aspect-video w-full" />
    <CardContent className="p-4 space-y-3">
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const TableRowSkeleton = ({ columns = 5 }: { columns?: number }) => (
  <tr>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="p-4">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

export const ListItemSkeleton = () => (
  <div className="flex items-center gap-4 p-4 border-b border-border">
    <Skeleton className="h-12 w-12 rounded-lg" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <Skeleton className="h-8 w-20 rounded-md" />
  </div>
);

export const StatsCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-4 w-24" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20 mt-2" />
    </CardContent>
  </Card>
);

export const ChatMessageSkeleton = () => (
  <div className="flex gap-3 p-3">
    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
);

interface GridSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4;
  SkeletonComponent?: React.ComponentType;
}

const gridColsMap = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export const GridSkeleton = ({ 
  count = 8, 
  columns = 4, 
  SkeletonComponent = NFTCardSkeleton 
}: GridSkeletonProps) => (
  <div className={`grid gap-4 ${gridColsMap[columns]}`}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonComponent key={i} />
    ))}
  </div>
);

// Full page loading skeleton with navbar placeholder
export const FullPageSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16 border-b border-border bg-background/95" />
    <PageSkeleton />
  </div>
);

export const PageSkeleton = () => (
  <div className="container py-8 space-y-8">
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-96" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
    <GridSkeleton count={8} columns={4} />
  </div>
);
