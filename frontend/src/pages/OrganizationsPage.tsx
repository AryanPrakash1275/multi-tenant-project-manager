import { useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { GET_ORGANIZATIONS } from "../graphql/organizations";
import { setOrgSlug } from "../tenant";
import { client } from "../apollo";

type Org = { id: string; name: string; slug: string };

export default function OrganizationsPage() {
  const nav = useNavigate();
  const { data, loading, error } = useQuery<{ organizations: Org[] }>(GET_ORGANIZATIONS);

  if (loading) return <div className="container">Loading organizations…</div>;
  if (error) return <div className="container">Error: {error.message}</div>;

  const orgs = data?.organizations ?? [];

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1 className="h1">Organizations</h1>
          <div className="sub">Choose a tenant to continue.</div>
        </div>
      </div>

      <div className="grid2">
        {orgs.map((o) => (
          <button
            key={o.id}
            className="card cardLink"
            style={{ textAlign: "left", cursor: "pointer" }}
            onClick={async () => {
              setOrgSlug(o.slug);
              await client.resetStore(); // prevent cross-tenant cached UI
              nav("/projects");
            }}
          >
            <div className="cardBd">
              <div className="rowBetween">
                <div className="titleMd">{o.name}</div>
                <span className="badge">
                  <span className="dot" />
                  {o.slug}
                </span>
              </div>
              <div className="sub" style={{ marginTop: 8 }}>Open projects →</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
