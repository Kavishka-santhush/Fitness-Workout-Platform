'use client';
import { useState } from 'react';
import { ThumbsUp, MessageCircle, Share2, Users } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useFeed, useCreatePost, useGiveKudos, useSuggestions } from '@/lib/hooks';
import { formatRelative } from '@/lib/utils';

export default function SocialPage() {
  const { data, isLoading } = useFeed();
  const { data: suggestions } = useSuggestions();
  const createPost = useCreatePost();
  const [text, setText] = useState('');

  const posts: any[] = (data as any)?.items ?? (Array.isArray(data) ? data : []);
  const sugg: any[] = (suggestions as any)?.items ?? (Array.isArray(suggestions) ? suggestions : []);

  const submit = () => {
    if (!text.trim()) return;
    createPost.mutate({ content: text, type: 'TEXT' }, { onSuccess: () => setText('') });
  };

  return (
    <div>
      <PageHeader title="Community" subtitle="Share wins, kudos, and stay accountable together." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share a workout, a PR, or a motivation…" className="min-h-[80px]" />
              <div className="mt-3 flex justify-end">
                <Button onClick={submit} disabled={createPost.isPending || !text.trim()}>{createPost.isPending ? 'Posting…' : 'Post'}</Button>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />)}</div>
          ) : posts.length === 0 ? (
            <EmptyState title="The feed is quiet" description="Follow people or post your first update." />
          ) : (
            posts.map((post) => <FeedPost key={post.id} post={post} />)
          )}
        </div>

        <div>
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold"><Users className="h-5 w-5 text-primary" /> Suggested athletes</div>
              {sugg.length === 0 ? (
                <p className="text-sm text-muted-foreground">No suggestions right now.</p>
              ) : (
                <div className="space-y-3">
                  {sugg.slice(0, 6).map((u) => (
                    <div key={u.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar src={u.avatarUrl} name={u.displayName} />
                        <div className="text-sm"><p className="font-medium">{u.displayName}</p><p className="text-xs text-muted-foreground">@{u.username}</p></div>
                      </div>
                      <Button size="sm" variant="outline">Follow</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FeedPost({ post }: { post: any }) {
  const kudos = useGiveKudos(post.id);
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <Avatar src={post.user?.avatarUrl} name={post.user?.displayName} />
          <div className="text-sm">
            <p className="font-medium">{post.user?.displayName}</p>
            <p className="text-xs text-muted-foreground">@{post.user?.username} · {formatRelative(post.createdAt)}</p>
          </div>
        </div>
        {post.content && <p className="mt-3 text-sm">{post.content}</p>}
        {post.workout && (
          <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm">
            💪 Completed <span className="font-medium">{post.workout.name}</span>
          </div>
        )}
        {(post.hashtags ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 text-xs text-primary">
            {post.hashtags.map((h: string) => <span key={h}>#{h}</span>)}
          </div>
        )}
        <div className="mt-4 flex items-center gap-5 text-sm text-muted-foreground">
          <button onClick={() => kudos.mutate({})} className="inline-flex items-center gap-1.5 hover:text-primary">
            <ThumbsUp className="h-4 w-4" /> {post.kudosCount ?? 0}
          </button>
          <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> {post.commentsCount ?? 0}</span>
          <span className="ml-auto inline-flex items-center gap-1.5"><Share2 className="h-4 w-4" /> Share</span>
        </div>
      </CardContent>
    </Card>
  );
}
