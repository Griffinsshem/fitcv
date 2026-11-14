'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Download, FileText, Pencil, Plus, X } from 'lucide-react';
import {
  CV_TEMPLATES,
  type ApplicationDetail,
  type CvTemplate,
  type KeywordResult,
  type TailoredCv,
} from '@fitcv/shared';
import { CvPreview } from '@/components/cv-preview';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Textarea } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { downloadBlob, fileSlug, THEMES } from '@/lib/export/theme';
import { useProfile, useSaveProfile, useUpdateApplication } from '@/lib/queries';

const CATEGORY_LABELS: Record<KeywordResult['category'], string> = {
  hard_skill: 'Skill',
  tool: 'Tool',
  soft_skill: 'Soft skill',
  qualification: 'Qualification',
  domain: 'Domain',
};

function KeywordList({ title, items }: { title: string; items: KeywordResult[] }) {
  if (items.length === 0) return null;
  const found = items.filter((k) => k.matched).length;
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {title}
        <span className="text-xs font-normal text-muted">
          {found} of {items.length} found
        </span>
      </h3>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {items.map((k) => (
          <li key={k.term} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {k.matched ? (
                <Check className="size-4 shrink-0 text-accent" aria-label="Found" />
              ) : (
                <X className="size-4 shrink-0 text-danger" aria-label="Missing" />
              )}
              <span className="truncate">{k.term}</span>
              {k.matched && k.matchedAs && k.matchedAs !== k.term && (
                <span className="truncate text-xs text-muted">as “{k.matchedAs}”</span>
              )}
            </span>
            <Badge>{CATEGORY_LABELS[k.category]}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MatchTab({ app }: { app: ApplicationDetail }) {
  const profile = useProfile();
  const save = useSaveProfile();
  const [added, setAdded] = useState<string[]>([]);
  const report = app.tailoredReport ?? app.matchReport;

  if (!app.analysis || !report) {
    return (
      <EmptyState
        icon={<FileText className="size-5" />}
        title="No match report yet"
        body="Run “Check match” or “Tailor CV & cover letter” to see which keywords from the job you already cover."
      />
    );
  }

  async function addSkill(skill: string) {
    if (!profile.data) return;
    const p = profile.data.profile;
    if (p.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) return;
    await save.mutateAsync({ ...p, skills: [...p.skills, skill] });
    setAdded((a) => [...a, skill]);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {app.analysis.summary && (
          <p className="text-sm leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">
              About this role{app.analysis.seniority ? ` (${app.analysis.seniority})` : ''}:{' '}
            </span>
            {app.analysis.summary}
          </p>
        )}
        <p className="text-xs text-muted">
          Showing results for your {app.tailoredReport ? 'tailored CV' : 'profile'}. Required
          keywords count three times as much as preferred ones.
        </p>
        <KeywordList
          title="Required"
          items={report.keywords.filter((k) => k.importance === 'required')}
        />
        <KeywordList
          title="Preferred"
          items={report.keywords.filter((k) => k.importance === 'preferred')}
        />
      </div>

      <aside className="space-y-4">
        <h3 className="text-sm font-semibold">Skills to build</h3>
        {app.suggestedSkills.length === 0 ? (
          <p className="text-sm text-muted">Suggestions appear after you tailor your CV.</p>
        ) : (
          <>
            <p className="text-xs leading-relaxed text-muted">
              These are not on your CV. If you genuinely have one, add it to your profile and
              re-tailor.
            </p>
            {app.suggestedSkills.map((s) => {
              const isAdded = added.includes(s.skill);
              return (
                <Card key={s.skill} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{s.skill}</p>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isAdded || save.isPending}
                      onClick={() => addSkill(s.skill)}
                    >
                      {isAdded ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                      {isAdded ? 'Added' : 'I have this'}
                    </Button>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-soft">{s.reason}</p>
                  {s.howToGain && (
                    <p className="mt-2 text-sm">
                      <span className="font-medium text-accent-strong">How to get it: </span>
                      {s.howToGain}
                    </p>
                  )}
                </Card>
              );
            })}
            {save.error && <Alert>{errorMessage(save.error)}</Alert>}
          </>
        )}
      </aside>
    </div>
  );
}

function TemplatePicker({
  value,
  onChange,
}: {
  value: CvTemplate;
  onChange: (t: CvTemplate) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="CV template">
      {CV_TEMPLATES.map((t) => (
        <button
          key={t}
          role="radio"
          aria-checked={value === t}
          onClick={() => onChange(t)}
          title={THEMES[t].description}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            value === t
              ? 'border-accent bg-accent-soft text-accent-strong'
              : 'border-line bg-paper text-ink-soft hover:bg-canvas'
          }`}
        >
          {THEMES[t].label}
        </button>
      ))}
    </div>
  );
}

function CvEditor({
  cv,
  onSave,
  onCancel,
  saving,
}: {
  cv: TailoredCv;
  onSave: (cv: TailoredCv) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(cv);
  const [skillsText, setSkillsText] = useState(cv.skills.join(', '));

  return (
    <Card className="space-y-5 p-5">
      <Field label="Headline" htmlFor="cv-headline">
        <Input
          id="cv-headline"
          value={draft.contact.headline}
          onChange={(e) =>
            setDraft({ ...draft, contact: { ...draft.contact, headline: e.target.value } })
          }
        />
      </Field>
      <Field label="Profile summary" htmlFor="cv-summary">
        <Textarea
          id="cv-summary"
          rows={4}
          value={draft.summary}
          onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
        />
      </Field>
      <Field label="Skills" htmlFor="cv-skills" hint="Comma-separated, most relevant first.">
        <Textarea
          id="cv-skills"
          rows={2}
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
        />
      </Field>
      {draft.experience.map((e, i) => (
        <Field
          key={e.id}
          label={`${e.role} — ${e.company}`}
          htmlFor={`cv-exp-${e.id}`}
          hint="One bullet per line."
        >
          <Textarea
            id={`cv-exp-${e.id}`}
            rows={Math.max(3, e.bullets.length + 1)}
            value={e.bullets.join('\n')}
            onChange={(ev) => {
              const experience = [...draft.experience];
              experience[i] = { ...e, bullets: ev.target.value.split('\n') };
              setDraft({ ...draft, experience });
            }}
          />
        </Field>
      ))}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          loading={saving}
          onClick={() =>
            onSave({
              ...draft,
              skills: skillsText
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              experience: draft.experience.map((e) => ({
                ...e,
                bullets: e.bullets.map((b) => b.trim()).filter(Boolean),
              })),
            })
          }
        >
          Save changes
        </Button>
      </div>
    </Card>
  );
}

export function CvTab({ app }: { app: ApplicationDetail }) {
  const update = useUpdateApplication(app.id);
  const [template, setTemplate] = useState<CvTemplate>(app.template);
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!app.tailoredCv) {
    return (
      <EmptyState
        icon={<FileText className="size-5" />}
        title="No tailored CV yet"
        body="Click “Tailor CV & cover letter” above. FitCV will rewrite and reorder your real experience for this job."
      />
    );
  }
  const cv = app.tailoredCv;
  const name = fileSlug(cv.contact.fullName, app.company, 'cv');

  async function exportAs(kind: 'pdf' | 'docx') {
    setExporting(kind);
    setExportError(null);
    try {
      if (kind === 'pdf') {
        const { cvPdfBlob } = await import('@/lib/export/pdf');
        downloadBlob(await cvPdfBlob(cv, template), `${name}.pdf`);
      } else {
        const { cvDocxBlob } = await import('@/lib/export/docx');
        downloadBlob(await cvDocxBlob(cv, template), `${name}.docx`);
      }
    } catch {
      setExportError('Could not create the file. Please try again.');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TemplatePicker
          value={template}
          onChange={(t) => {
            setTemplate(t);
            update.mutate({ template: t });
          }}
        />
        <div className="flex flex-wrap gap-2">
          {!editing && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden /> Edit
            </Button>
          )}
          <Button
            variant="secondary"
            loading={exporting === 'docx'}
            onClick={() => exportAs('docx')}
          >
            <Download className="size-4" aria-hidden /> Word
          </Button>
          <Button loading={exporting === 'pdf'} onClick={() => exportAs('pdf')}>
            <Download className="size-4" aria-hidden /> PDF
          </Button>
        </div>
      </div>
      {exportError && <Alert>{exportError}</Alert>}
      {update.error && <Alert>{errorMessage(update.error)}</Alert>}

      {app.changeNotes.length > 0 && !editing && (
        <details className="rounded-lg border border-line bg-paper px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">
            What FitCV changed ({app.changeNotes.length})
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
            {app.changeNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </details>
      )}

      {editing ? (
        <CvEditor
          cv={cv}
          saving={update.isPending}
          onCancel={() => setEditing(false)}
          onSave={async (next) => {
            await update.mutateAsync({ tailoredCv: next });
            setEditing(false);
          }}
        />
      ) : (
        <div className="overflow-x-auto rounded-card bg-canvas p-4 ring-1 ring-line sm:p-8">
          <CvPreview cv={cv} template={template} />
        </div>
      )}
    </div>
  );
}

export function CoverLetterTab({ app }: { app: ApplicationDetail }) {
  const update = useUpdateApplication(app.id);
  const [text, setText] = useState(app.coverLetter ?? '');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => setText(app.coverLetter ?? ''), [app.coverLetter]);

  if (!app.coverLetter || !app.tailoredCv) {
    return (
      <EmptyState
        icon={<FileText className="size-5" />}
        title="No cover letter yet"
        body="Your cover letter is written together with your tailored CV, so they tell the same story."
      />
    );
  }
  const cv = app.tailoredCv;
  const dirty = text !== app.coverLetter;
  const name = fileSlug(cv.contact.fullName, app.company, 'cover-letter');
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  async function exportAs(kind: 'pdf' | 'docx') {
    setExporting(kind);
    try {
      if (kind === 'pdf') {
        const { letterPdfBlob } = await import('@/lib/export/pdf');
        downloadBlob(await letterPdfBlob(cv, text, app.template), `${name}.pdf`);
      } else {
        const { letterDocxBlob } = await import('@/lib/export/docx');
        downloadBlob(await letterDocxBlob(cv, text), `${name}.docx`);
      }
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">{words} words</span>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{' '}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="secondary"
            loading={exporting === 'docx'}
            onClick={() => exportAs('docx')}
          >
            <Download className="size-4" aria-hidden /> Word
          </Button>
          <Button loading={exporting === 'pdf'} onClick={() => exportAs('pdf')}>
            <Download className="size-4" aria-hidden /> PDF
          </Button>
        </div>
      </div>
      <Textarea
        aria-label="Cover letter"
        rows={22}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="font-serif text-[15px] leading-7"
      />
      {update.error && <Alert>{errorMessage(update.error)}</Alert>}
      {dirty && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setText(app.coverLetter ?? '')}>
            Discard
          </Button>
          <Button loading={update.isPending} onClick={() => update.mutate({ coverLetter: text })}>
            Save letter
          </Button>
        </div>
      )}
    </div>
  );
}

export function JobTab({ app }: { app: ApplicationDetail }) {
  const update = useUpdateApplication(app.id);
  const [notes, setNotes] = useState(app.notes);
  const [jd, setJd] = useState(app.jobDescription);
  const [editingJd, setEditingJd] = useState(false);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Job description</h3>
          {!editingJd && (
            <Button size="sm" variant="ghost" onClick={() => setEditingJd(true)}>
              <Pencil className="size-3.5" aria-hidden /> Edit
            </Button>
          )}
        </div>
        {editingJd ? (
          <div className="space-y-3">
            <Textarea
              aria-label="Job description"
              rows={18}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
            <p className="text-xs text-warn">
              Saving a changed description clears the match report so it can be re-checked.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setJd(app.jobDescription);
                  setEditingJd(false);
                }}
              >
                Cancel
              </Button>
              <Button
                loading={update.isPending}
                onClick={async () => {
                  await update.mutateAsync({ jobDescription: jd });
                  setEditingJd(false);
                }}
              >
                Save description
              </Button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap rounded-lg border border-line bg-paper p-4 text-sm leading-relaxed text-ink-soft">
            {app.jobDescription}
          </div>
        )}
      </div>
      <div className="space-y-3">
        <Field
          label="Notes"
          htmlFor="notes"
          hint="Contacts, interview dates, salary range — anything useful."
        >
          <Textarea id="notes" rows={10} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {update.error && <Alert>{errorMessage(update.error)}</Alert>}
        <div className="flex justify-end">
          <Button
            variant="secondary"
            disabled={notes === app.notes}
            loading={update.isPending}
            onClick={() => update.mutate({ notes })}
          >
            Save notes
          </Button>
        </div>
      </div>
    </div>
  );
}
