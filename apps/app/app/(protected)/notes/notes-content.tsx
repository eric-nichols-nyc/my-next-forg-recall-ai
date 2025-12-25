import { SummariesList } from "./summaries-list";

type NotesContentProps = {
  session: unknown;
  user: { id: string } | null;
};

export function NotesContent({ session, user }: NotesContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <h1 className="font-semibold text-2xl">Server Rendered Page</h1>

        <p className="text-gray-400">
          Authenticated:{" "}
          <span className={session ? "text-green-500" : "text-red-500"}>
            {session ? "Yes" : "No"}
          </span>
        </p>

        {user ? (
          <p className="text-gray-400">User ID: {user.id}</p>
        ) : null}

        <p className="font-medium text-gray-700 dark:text-gray-200">
          Session and User Data:
        </p>

        {/* <pre className="rounded bg-gray-100 p-4 text-gray-800 text-sm dark:bg-gray-800 dark:text-gray-200">
          {JSON.stringify({ session, user }, null, 2)}
        </pre> */}

        <p className="text-muted-foreground">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
          enim ad minim veniam, quis nostrud exercitation ullamco laboris
          nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
          in reprehenderit in voluptate velit esse cillum dolore eu fugiat
          nulla pariatur.
        </p>

        <div className="space-y-4">
          <h2 className="font-semibold text-xl">Section 1</h2>
          <p className="text-muted-foreground">
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem
            accusantium doloremque laudantium, totam rem aperiam, eaque
            ipsa quae ab illo inventore veritatis et quasi architecto
            beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem
            quia voluptas sit aspernatur aut odit aut fugit.
          </p>
          <p className="text-muted-foreground">
            At vero eos et accusamus et iusto odio dignissimos ducimus qui
            blanditiis praesentium voluptatum deleniti atque corrupti quos
            dolores et quas molestias excepturi sint occaecati cupiditate
            non provident, similique sunt in culpa qui officia deserunt
            mollitia animi, id est laborum et dolorum fuga.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-xl">Section 2</h2>
          <p className="text-muted-foreground">
            Et harum quidem rerum facilis est et expedita distinctio. Nam
            libero tempore, cum soluta nobis est eligendi optio cumque
            nihil impedit quo minus id quod maxime placeat facere
            possimus, omnis voluptas assumenda est, omnis dolor
            repellendus.
          </p>
          <p className="text-muted-foreground">
            Temporibus autem quibusdam et aut officiis debitis aut rerum
            necessitatibus saepe eveniet ut et voluptates repudiandae sint
            et molestiae non recusandae. Itaque earum rerum hic tenetur a
            sapiente delectus, ut aut reiciendis voluptatibus maiores
            alias consequatur aut perferendis doloribus asperiores
            repellat.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-xl">Section 3</h2>
          <p className="text-muted-foreground">
            On the other hand, we denounce with righteous indignation and
            dislike men who are so beguiled and demoralized by the charms
            of pleasure of the moment, so blinded by desire, that they
            cannot foresee the pain and trouble that are bound to ensue.
          </p>
          <p className="text-muted-foreground">
            And equal blame belongs to those who fail in their duty
            through weakness of will, which is the same as saying through
            shrinking from toil and pain. These cases are perfectly simple
            and easy to distinguish. In a free hour, when our power of
            choice is untrammelled and when nothing prevents our being
            able to do what we like best.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-xl">Section 4</h2>
          <p className="text-muted-foreground">
            Every pleasure is to be welcomed and every pain avoided. But
            in certain circumstances and owing to the claims of duty or
            the obligations of business it will frequently occur that
            pleasures have to be repudiated and annoyances accepted.
          </p>
          <p className="text-muted-foreground">
            The wise man therefore always holds in these matters to this
            principle of selection: he rejects pleasures to secure other
            greater pleasures, or else he endures pains to avoid worse
            pains. But I must explain to you how all this mistaken idea of
            denouncing pleasure and praising pain was born.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-xl">Section 5</h2>
          <p className="text-muted-foreground">
            I will give you a complete account of the system, and expound
            the actual teachings of the great explorer of the truth, the
            master-builder of human happiness. No one rejects, dislikes,
            or avoids pleasure itself, because it is pleasure, but because
            those who do not know how to pursue pleasure rationally
            encounter consequences that are extremely painful.
          </p>
          <p className="text-muted-foreground">
            Nor again is there anyone who loves or pursues or desires to
            obtain pain of itself, because it is pain, but because
            occasionally circumstances occur in which toil and pain can
            procure him some great pleasure. To take a trivial example,
            which of us ever undertakes laborious physical exercise,
            except to obtain some advantage from it?
          </p>
        </div>

        <div className="mt-8">
          <h2 className="font-semibold text-xl mb-4">Your summaries</h2>
          <SummariesList isAuthenticated={!!user} />
        </div>
      </div>
    </div>
  );
}
