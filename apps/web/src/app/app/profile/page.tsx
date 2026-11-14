'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, type Control, type UseFormRegister } from 'react-hook-form';
import { Plus, Trash2, Upload } from 'lucide-react';
import { MasterProfileSchema, type MasterProfile } from '@fitcv/shared';
import { Alert, Button, Card, Field, Input, Spinner, Textarea } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { keys, useJob, useProfile, useSaveProfile } from '@/lib/queries';

const uid = (p: string) => `${p}-${crypto.randomUUID().slice(0, 8)}`;

/** Form-friendly shape: list fields edited as newline / comma text. */
type FormValues = Omit<MasterProfile, 'skills' | 'languages' | 'experience' | 'projects'> & {
  skillsText: string;
  languagesText: string;
  experience: Array<Omit<MasterProfile['experience'][number], 'bullets'> & { bulletsText: string }>;
  projects: Array<
    Omit<MasterProfile['projects'][number], 'technologies'> & { technologiesText: string }
  >;
};

const splitLines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
const splitCommas = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

function toForm(p: MasterProfile): FormValues {
  return {
    ...p,
    skillsText: p.skills.join(', '),
    languagesText: p.languages.join(', '),
    experience: p.experience.map(({ bullets, ...e }) => ({
      ...e,
      bulletsText: bullets.join('\n'),
    })),
    projects: p.projects.map(({ technologies, ...pr }) => ({
      ...pr,
      technologiesText: technologies.join(', '),
    })),
  };
}

function fromForm(v: FormValues): MasterProfile {
  const { skillsText, languagesText, ...rest } = v;
  return MasterProfileSchema.parse({
    ...rest,
    skills: splitCommas(skillsText),
    languages: splitCommas(languagesText),
    experience: v.experience.map(({ bulletsText, ...e }) => ({
      ...e,
      bullets: splitLines(bulletsText),
    })),
    projects: v.projects.map(({ technologiesText, ...p }) => ({
      ...p,
      technologies: splitCommas(technologiesText),
    })),
  });
}

function Section({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-5">{children}</div>
    </Card>
  );
}

function ImportCard({ onDraft }: { onDraft: (p: MasterProfile) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const job = useJob(jobId);
  const qc = useQueryClient();

  useEffect(() => {
    if (job.data?.status === 'SUCCEEDED' && job.data.result) {
      onDraft(job.data.result);
      setJobId(null);
      void qc.invalidateQueries({ queryKey: keys.me });
    }
    if (job.data?.status === 'FAILED') {
      setError(job.data.error ?? 'Import failed.');
      setJobId(null);
    }
  }, [job.data, onDraft, qc]);

  async function onFile(file: File) {
    setError(null);
    if (file.size > 4 * 1024 * 1024) return setError('File is too large (max 4 MB).');
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const r = await api<{ jobId: string }>('/profile/import', { method: 'POST', body });
      setJobId(r.jobId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const busy = uploading || !!jobId;
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 border-dashed p-5">
      <div>
        <h2 className="font-semibold">Import from your existing CV</h2>
        <p className="mt-0.5 text-sm text-muted">
          PDF or Word, up to 4 MB. You review everything before it is saved.
        </p>
        {error && (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        id="cv-upload"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      {busy ? (
        <Spinner label={uploading ? 'Uploading…' : 'Reading your CV…'} />
      ) : (
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" aria-hidden /> Upload CV
        </Button>
      )}
    </Card>
  );
}

function ExperienceFields({
  control,
  register,
}: {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'experience' });
  return (
    <Section
      title="Experience"
      description="Most recent first. Write bullets as achievements; FitCV will tailor the wording per job."
      action={
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() =>
            append({
              id: uid('exp'),
              role: '',
              company: '',
              location: '',
              startDate: '',
              endDate: '',
              current: false,
              bulletsText: '',
            })
          }
        >
          <Plus className="size-3.5" /> Add role
        </Button>
      }
    >
      {fields.length === 0 && (
        <p className="text-sm text-muted">
          No roles yet. Internships, freelance and volunteer work count too.
        </p>
      )}
      {fields.map((f, i) => (
        <div key={f.id} className="space-y-4 rounded-lg border border-line p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Job title" htmlFor={`exp-role-${i}`}>
              <Input id={`exp-role-${i}`} {...register(`experience.${i}.role`)} />
            </Field>
            <Field label="Company" htmlFor={`exp-co-${i}`}>
              <Input id={`exp-co-${i}`} {...register(`experience.${i}.company`)} />
            </Field>
            <Field label="Start" htmlFor={`exp-start-${i}`}>
              <Input
                id={`exp-start-${i}`}
                placeholder="Jan 2024"
                {...register(`experience.${i}.startDate`)}
              />
            </Field>
            <Field label="End" htmlFor={`exp-end-${i}`}>
              <Input
                id={`exp-end-${i}`}
                placeholder="Leave empty if current"
                {...register(`experience.${i}.endDate`)}
              />
            </Field>
            <Field label="Location" htmlFor={`exp-loc-${i}`}>
              <Input id={`exp-loc-${i}`} {...register(`experience.${i}.location`)} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-accent)]"
                {...register(`experience.${i}.current`)}
              />{' '}
              I work here now
            </label>
          </div>
          <Field
            label="Achievements"
            htmlFor={`exp-b-${i}`}
            hint="One per line. Numbers help: “Cut page load by 40%”."
          >
            <Textarea id={`exp-b-${i}`} rows={4} {...register(`experience.${i}.bulletsText`)} />
          </Field>
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>
              <Trash2 className="size-3.5" /> Remove role
            </Button>
          </div>
        </div>
      ))}
    </Section>
  );
}

function EducationFields({
  control,
  register,
}: {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'education' });
  return (
    <Section
      title="Education"
      action={
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() =>
            append({
              id: uid('edu'),
              institution: '',
              qualification: '',
              field: '',
              startDate: '',
              endDate: '',
              details: '',
            })
          }
        >
          <Plus className="size-3.5" /> Add
        </Button>
      }
    >
      {fields.map((f, i) => (
        <div key={f.id} className="grid gap-4 rounded-lg border border-line p-4 sm:grid-cols-2">
          <Field label="Qualification" htmlFor={`edu-q-${i}`}>
            <Input
              id={`edu-q-${i}`}
              placeholder="BSc / Certificate"
              {...register(`education.${i}.qualification`)}
            />
          </Field>
          <Field label="Institution" htmlFor={`edu-i-${i}`}>
            <Input id={`edu-i-${i}`} {...register(`education.${i}.institution`)} />
          </Field>
          <Field label="Field of study" htmlFor={`edu-f-${i}`}>
            <Input id={`edu-f-${i}`} {...register(`education.${i}.field`)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start" htmlFor={`edu-s-${i}`}>
              <Input id={`edu-s-${i}`} {...register(`education.${i}.startDate`)} />
            </Field>
            <Field label="End" htmlFor={`edu-e-${i}`}>
              <Input id={`edu-e-${i}`} {...register(`education.${i}.endDate`)} />
            </Field>
          </div>
          <Field label="Details" htmlFor={`edu-d-${i}`} className="sm:col-span-2">
            <Input
              id={`edu-d-${i}`}
              placeholder="Honours, relevant modules…"
              {...register(`education.${i}.details`)}
            />
          </Field>
          <div className="flex justify-end sm:col-span-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>
              <Trash2 className="size-3.5" /> Remove
            </Button>
          </div>
        </div>
      ))}
    </Section>
  );
}

function ProjectFields({
  control,
  register,
}: {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'projects' });
  return (
    <Section
      title="Projects"
      description="Especially valuable early in your career."
      action={
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() =>
            append({ id: uid('proj'), name: '', link: '', description: '', technologiesText: '' })
          }
        >
          <Plus className="size-3.5" /> Add
        </Button>
      }
    >
      {fields.map((f, i) => (
        <div key={f.id} className="grid gap-4 rounded-lg border border-line p-4 sm:grid-cols-2">
          <Field label="Name" htmlFor={`pr-n-${i}`}>
            <Input id={`pr-n-${i}`} {...register(`projects.${i}.name`)} />
          </Field>
          <Field label="Link" htmlFor={`pr-l-${i}`}>
            <Input
              id={`pr-l-${i}`}
              type="url"
              placeholder="https://"
              {...register(`projects.${i}.link`)}
            />
          </Field>
          <Field label="What it does and your role" htmlFor={`pr-d-${i}`} className="sm:col-span-2">
            <Textarea id={`pr-d-${i}`} rows={3} {...register(`projects.${i}.description`)} />
          </Field>
          <Field
            label="Technologies"
            htmlFor={`pr-t-${i}`}
            className="sm:col-span-2"
            hint="Comma-separated."
          >
            <Input id={`pr-t-${i}`} {...register(`projects.${i}.technologiesText`)} />
          </Field>
          <div className="flex justify-end sm:col-span-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>
              <Trash2 className="size-3.5" /> Remove
            </Button>
          </div>
        </div>
      ))}
    </Section>
  );
}

function CertificationFields({
  control,
  register,
}: {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'certifications' });
  return (
    <Section
      title="Certifications"
      action={
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => append({ id: uid('cert'), name: '', issuer: '', date: '' })}
        >
          <Plus className="size-3.5" /> Add
        </Button>
      }
    >
      {fields.map((f, i) => (
        <div key={f.id} className="grid items-end gap-3 sm:grid-cols-[2fr_1.5fr_1fr_auto]">
          <Field label="Name" htmlFor={`c-n-${i}`}>
            <Input id={`c-n-${i}`} {...register(`certifications.${i}.name`)} />
          </Field>
          <Field label="Issuer" htmlFor={`c-i-${i}`}>
            <Input id={`c-i-${i}`} {...register(`certifications.${i}.issuer`)} />
          </Field>
          <Field label="Date" htmlFor={`c-d-${i}`}>
            <Input id={`c-d-${i}`} {...register(`certifications.${i}.date`)} />
          </Field>
          <Button
            type="button"
            variant="ghost"
            aria-label="Remove certification"
            onClick={() => remove(i)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
    </Section>
  );
}

function AccountSection() {
  const router = useRouter();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <Section title="Account and privacy">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          Signed in on a shared computer? End every other session.
        </p>
        <Button
          variant="secondary"
          loading={busy === 'others'}
          onClick={async () => {
            setBusy('others');
            await api('/auth/logout-others', { method: 'POST' }).catch(() => undefined);
            setBusy(null);
            setMsg('Other sessions signed out.');
          }}
        >
          Sign out other devices
        </Button>
      </div>
      {msg && <Alert tone="accent">{msg}</Alert>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-sm text-ink-soft">
          Permanently delete your account, profile and all applications.
        </p>
        {confirm ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep account
            </Button>
            <Button
              variant="danger"
              loading={busy === 'delete'}
              onClick={async () => {
                setBusy('delete');
                await api('/auth/me', { method: 'DELETE' });
                qc.clear();
                router.replace('/');
              }}
            >
              Delete my account and data
            </Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Delete account
          </Button>
        )}
      </div>
    </Section>
  );
}

export default function ProfilePage() {
  const profile = useProfile();
  const save = useSaveProfile();
  const [imported, setImported] = useState(false);
  const [saved, setSaved] = useState(false);
  const form = useForm<FormValues>({ mode: 'onBlur' });
  const { register, control, reset, handleSubmit, formState } = form;

  useEffect(() => {
    if (profile.data) reset(toForm(profile.data.profile));
  }, [profile.data, reset]);

  if (profile.isPending) return <Spinner />;
  if (profile.error) return <Alert>{errorMessage(profile.error)}</Alert>;

  const onSubmit = handleSubmit(async (values) => {
    setSaved(false);
    let parsed: MasterProfile;
    try {
      parsed = fromForm(values);
    } catch {
      form.setError('root', {
        message: 'Some fields are invalid: check emails and links start with https://.',
      });
      return;
    }
    await save.mutateAsync(parsed);
    setImported(false);
    setSaved(true);
    reset(toForm(parsed));
  });

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6 pb-24" noValidate>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted">
          Your master CV. Every tailored CV is built only from what is here, so include everything
          relevant.
        </p>
      </div>

      <ImportCard
        onDraft={(draft) => {
          reset(toForm({ ...draft, contact: { ...draft.contact } }), { keepDefaultValues: true });
          setImported(true);
        }}
      />
      {imported && (
        <Alert tone="warn">
          Imported from your CV. Review every section, then save. Nothing is stored until you click
          Save.
        </Alert>
      )}

      <Section title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="fullName">
            <Input id="fullName" autoComplete="name" {...register('contact.fullName')} />
          </Field>
          <Field label="Headline" htmlFor="headline">
            <Input
              id="headline"
              placeholder="Full-stack developer"
              {...register('contact.headline')}
            />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" {...register('contact.email')} />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" type="tel" autoComplete="tel" {...register('contact.phone')} />
          </Field>
          <Field label="Location" htmlFor="location">
            <Input id="location" placeholder="Nairobi, Kenya" {...register('contact.location')} />
          </Field>
          <Field label="LinkedIn" htmlFor="linkedin">
            <Input
              id="linkedin"
              type="url"
              placeholder="https://linkedin.com/in/…"
              {...register('contact.linkedin')}
            />
          </Field>
          <Field label="GitHub" htmlFor="github">
            <Input
              id="github"
              type="url"
              placeholder="https://github.com/…"
              {...register('contact.github')}
            />
          </Field>
          <Field label="Website" htmlFor="website">
            <Input
              id="website"
              type="url"
              placeholder="https://"
              {...register('contact.website')}
            />
          </Field>
        </div>
      </Section>

      <Section title="Summary and skills">
        <Field
          label="Professional summary"
          htmlFor="summary"
          hint="2–4 sentences. FitCV rewrites this for each job."
        >
          <Textarea id="summary" rows={4} {...register('summary')} />
        </Field>
        <Field
          label="Skills"
          htmlFor="skills"
          hint="Comma-separated. List every tool and skill you can genuinely use."
        >
          <Textarea
            id="skills"
            rows={3}
            placeholder="TypeScript, React, Node.js, PostgreSQL…"
            {...register('skillsText')}
          />
        </Field>
        <Field
          label="Languages"
          htmlFor="languages"
          hint="Comma-separated, e.g. English (fluent), Swahili (native)"
        >
          <Input id="languages" {...register('languagesText')} />
        </Field>
      </Section>

      <ExperienceFields control={control} register={register} />
      <ProjectFields control={control} register={register} />
      <EducationFields control={control} register={register} />
      <CertificationFields control={control} register={register} />
      <AccountSection />

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-3 px-5 py-3">
          {formState.errors.root && (
            <span className="text-sm text-danger">{formState.errors.root.message}</span>
          )}
          {save.error && <span className="text-sm text-danger">{errorMessage(save.error)}</span>}
          {saved && !formState.isDirty && <span className="text-sm text-accent">Saved</span>}
          <Button
            type="submit"
            loading={formState.isSubmitting}
            disabled={!formState.isDirty && !imported}
          >
            Save profile
          </Button>
        </div>
      </div>
    </form>
  );
}
