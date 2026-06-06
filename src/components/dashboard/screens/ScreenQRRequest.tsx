'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon, Card, CardHeader, Btn, Field, Input, Select, Switch, Segmented } from '../ui';
import { QRCanvas } from '../ui-qr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="lp-page-hd">
      <div>
        <h1 className="lp-h1">{title}</h1>
        {sub && <div className="lp-page-sub">{sub}</div>}
      </div>
      {actions && <div className="lp-page-act">{actions}</div>}
    </div>
  );
}

export default function ScreenQRRequest() {
  const { data: bizData } = useQuery<{ business: { name: string; logo_initials: string; brand_color: string } | null }>({
    queryKey: ['/api/businesses'],
    queryFn:  () => fetcher('/api/businesses'),
  });
  const biz = bizData?.business;

  const [name, setName] = useState('Sidewalk Sign');
  const [slug, setSlug] = useState('sidewalk-sign');
  const [color, setColor] = useState('#6366F1');
  const [bg, setBg] = useState('#FFFFFF');
  const [size, setSize] = useState(220);
  const [eyeStyle, setEyeStyle] = useState('rounded');
  const [format, setFormat] = useState('standalone');
  const [orderPrint, setOrderPrint] = useState(true);
  const [qty, setQty] = useState(50);
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const appHost   = typeof window !== 'undefined' ? window.location.host   : '';
  const fullUrl   = `${appOrigin}/r/${slug}`;

  return (
    <div className="lp-page">
      <PageHeader
        title="New QR campaign"
        sub="Configure, brand and order your QR materials"
        actions={
          <>
            <Btn>Save as draft</Btn>
            <Btn variant="primary" icon="rocket">Launch campaign</Btn>
          </>
        }
      />

      <div className="lp-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
        <div className="lp-stack">
          <Card>
            <CardHeader title="Campaign details" eyebrow="Step 1"/>
            <div className="lp-grid lp-grid-2" style={{ gap: 14 }}>
              <Field label="Campaign name">
                <Input value={name} onChange={(e) => setName(e.target.value)} icon="qr"/>
              </Field>
              <Field label="Slug">
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} prefix={`${appHost}/r/`}/>
              </Field>
              <Field label="Assign to location">
                <Select value="nw" onChange={() => {}} options={[
                  {value:'nw',label:'NW Portland'},{value:'se',label:'SE Division'},
                ]}/>
              </Field>
              <Field label="Funnel variant">
                <Select value="default" onChange={() => {}} options={[
                  {value:'default',label:'Default funnel'},{value:'patio',label:'Patio event funnel'},
                ]}/>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Brand the QR code" eyebrow="Step 2"/>
            <div className="lp-grid lp-grid-2" style={{ gap: 14 }}>
              <Field label="Foreground color">
                <div className="lp-color-row">
                  {['#0A0B14','#6366F1','#8B5CF6','#0F766E','#B45309','#BE123C'].map(c => (
                    <button key={c} onClick={() => setColor(c)} className={`lp-color-sw ${color === c ? 'is-on' : ''}`} style={{ background: c }}/>
                  ))}
                </div>
              </Field>
              <Field label="Background">
                <div className="lp-color-row">
                  {['#FFFFFF','#FAFAF7','#FFF6E8','#ECFDF5','#EEF2FF'].map(c => (
                    <button key={c} onClick={() => setBg(c)} className={`lp-color-sw ${bg === c ? 'is-on' : ''}`} style={{ background: c, border: '1px solid var(--lp-border)' }}/>
                  ))}
                </div>
              </Field>
              <Field label="Eye style">
                <Segmented value={eyeStyle} onChange={setEyeStyle} options={[
                  {value:'rounded',label:'Rounded'},{value:'square',label:'Square'},{value:'leaf',label:'Leaf'},
                ]}/>
              </Field>
              <Field label="Size" hint={`${size}px`}>
                <input type="range" min="160" max="320" step="10" value={size}
                       onChange={(e) => setSize(Number(e.target.value))} className="lp-range"/>
              </Field>
            </div>
            <Switch label="Show logo in center" sub="A small mark inside the code" checked={true} onChange={() => {}}/>
            <Switch label="Add caption beneath" sub="Scan to leave a review" checked={true} onChange={() => {}}/>
          </Card>

          <Card>
            <CardHeader title="Order physical materials" eyebrow="Step 3 · Optional"/>
            <Switch label="Order printed QR materials" sub="We'll print and ship to your business address" checked={orderPrint} onChange={setOrderPrint}/>
            {orderPrint && (
              <>
                <div className="lp-grid lp-grid-2" style={{ marginTop: 14, gap: 10 }}>
                  {[
                    {v:'standalone', label:'Standalone print', price:'$0',      sub:'Download PNG/PDF'},
                    {v:'table-tent', label:'Table tents',      price:'$1.20/ea', sub:'Foldable cards'},
                    {v:'sticker',    label:'Stickers',         price:'$0.40/ea', sub:'Adhesive vinyl'},
                    {v:'poster',     label:'Wall posters',     price:'$3.50/ea', sub:'A4 paper'},
                  ].map(f => (
                    <button key={f.v} onClick={() => setFormat(f.v)} className={`lp-pick lp-pick-h ${format === f.v ? 'is-on' : ''}`}>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div className="lp-pick-title">{f.label}</div>
                        <div className="lp-pick-sub">{f.sub}</div>
                      </div>
                      <div className="lp-pick-price">{f.price}</div>
                    </button>
                  ))}
                </div>
                <div className="lp-grid lp-grid-2" style={{ marginTop: 14, gap: 14 }}>
                  <Field label="Quantity">
                    <div className="lp-stepper">
                      <button onClick={() => setQty(q => Math.max(10, q - 10))}>−</button>
                      <span><b>{qty}</b></span>
                      <button onClick={() => setQty(q => q + 10)}>+</button>
                    </div>
                  </Field>
                  <Field label="Estimated delivery">
                    <div className="lp-delivery">
                      <Icon name="package" size={16}/>
                      <span>5–7 business days · Free on Pro</span>
                    </div>
                  </Field>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="lp-stack" style={{ position: 'sticky', top: 12 }}>
          <Card>
            <CardHeader title="Live preview" subtitle="Updates as you change settings"/>
            <div className="lp-print-preview" style={{ background: bg }}>
              <div className="lp-print-logo" style={{ background: biz?.brand_color ?? color, color: '#fff' }}>
                {biz?.logo_initials ?? '??'}
              </div>
              <div className="lp-print-h" style={{ color }}>Loved your visit?</div>
              <div className="lp-print-sub">Scan to leave a quick review</div>
              <QRCanvas value={fullUrl} size={size} color={color} bg={bg} radius={16}/>
              <div className="lp-print-foot">
                <div className="lp-print-biz">{biz?.name ?? 'Your Business'}</div>
                <div className="lp-print-url">{appHost}/r/{slug}</div>
              </div>
              <div className="lp-print-stars">
                {[1,2,3,4,5].map(i => <span key={i}>★</span>)}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
