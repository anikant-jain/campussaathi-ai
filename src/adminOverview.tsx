import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowDownRight, BookOpen, BriefcaseBusiness, Clock3, GraduationCap, Sparkles, TrendingUp, TriangleAlert, Users } from 'lucide-react';
import { Empty, Fields, Header, Panel, QueryView, useData } from './ui';
import { Tile } from './dashboard';

export function AdminOverview(){
  const [range,setRange]=useState({from:'',to:''});
  const search=new URLSearchParams(Object.entries(range).filter(([,value])=>value)).toString();
  const query=useData<any>('/analytics'+(search?'?'+search:''));
  return <><Header title="Admin command center" description="Monitor campus activity and coordinate operational work." actions={<><Link className="btn neutral" to="/app/intelligence"><Sparkles size={17}/> Campus intelligence</Link><a className="btn primary" href={'/api/analytics?format=csv'+(search?'&'+search:'')}><ArrowDownRight size={17}/> Export CSV</a></>}/>
    <Panel title="Report date range"><Fields fields={[{name:'from',label:'Start date',type:'date',optional:true,value:range.from},{name:'to',label:'End date',type:'date',optional:true,value:range.to}]} label="Apply date range" submit={async values=>setRange(values as typeof range)}/></Panel>
    <QueryView query={query}>{data=><><div className="metrics admin-metrics">
      <Tile label="Students" value={data.students} detail="Registered accounts" to="/app/directory" tone="violet" Icon={Users}/>
      <Tile label="Faculty" value={data.faculty} detail={data.departments+' departments'} to="/app/directory" tone="blue" Icon={GraduationCap}/>
      <Tile label="Attendance" value={data.attendance===null?'—':data.attendance+'%'} detail={data.classrooms+' active classrooms'} to="/app/coursework" tone="mint" Icon={TrendingUp}/>
      <Tile label="Pending complaints" value={data.pending} detail={data.resolved+' resolved'} to="/app/complaints" tone="amber" Icon={TriangleAlert}/>
    </div><div className="two-columns">
      <Panel title="Attendance trend">{data.attendanceTrend.length?<div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.attendanceTrend} margin={{top:10,right:12,left:-20,bottom:0}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="name" stroke="var(--muted)"/><YAxis domain={[0,100]} stroke="var(--muted)"/><Tooltip/><Area dataKey="value" name="Attendance (%)" stroke="#6366f1" fill="#6366f133" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>:<Empty title="No attendance in this range"/>}</Panel>
      <Panel title="Complaints by department">{data.complaintGroups.length?<div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.complaintGroups} margin={{top:10,right:12,left:-20,bottom:10}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="name" hide/><YAxis allowDecimals={false} stroke="var(--muted)"/><Tooltip/><Bar dataKey="value" name="Tickets" fill="#8b5cf6" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>:<Empty title="No complaints in this range"/>}</Panel>
    </div><div className="metrics admin-metrics">
      <Tile label="Event registrations" value={data.eventParticipation} detail="During selected range" to="/app/events" tone="violet" Icon={Activity}/>
      <Tile label="Library loans" value={data.libraryLoans} detail="During selected range" to="/app/library" tone="blue" Icon={BookOpen}/>
      <Tile label="Applications tracked" value={data.placementActivity} detail="During selected range" to="/app/placements" tone="mint" Icon={BriefcaseBusiness}/>
      <Tile label="Resolution time" value={data.resolutionHours===null?'—':data.resolutionHours+' h'} detail="Average for resolved tickets" to="/app/complaints" tone="amber" Icon={Clock3}/>
    </div></>}</QueryView>
  </>;
}

