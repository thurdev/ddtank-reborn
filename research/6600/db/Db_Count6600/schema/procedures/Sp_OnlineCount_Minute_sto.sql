-- SQL_STORED_PROCEDURE dbo.Sp_OnlineCount_Minute_sto (modified 2012-04-21T07:53:25.043)
CREATE  Procedure   [dbo].[Sp_OnlineCount_Minute_sto]
@BeginDate DateTime,
@EndDate DateTime,
@ApplicationId int,
@AgentsID varchar(50),
@Msg varchar(50) output 
 As

/*第一步：计算出时间范围*/
Declare @i Int
Declare @j Numeric(10,2)
Set @i=0
Create Table #Temp(Reg_Date Numeric(10,2))
While @i < =23
      Begin
         Set @j=0
             While @j<=0.11
                   Begin                   
  		      Insert Into #Temp(Reg_Date) Values(@i+@j)   
                      Set @j=@j+0.01                  
                   End           
             Set @i=@i+1
          End

Select ApplicationId,SubId as AgentsID,Convert(Char(10),EnterTime,120) As Regdate,Cast(DATEPART(hh, EnterTime)+DATEPART(mi, EnterTime)/5/100.00 as decimal(10,2)) As HourMinute,Max(Reg) As Reg,Max(Online) As Online Into #Temp_Online From  db_logs.dbo.Log_Server
       Where EnterTime>=@BeginDate and EnterTime<=@EndDate and  ApplicationId=@ApplicationId and SubId=@AgentsID
       Group By ApplicationId,SubId,Convert(Char(10),EnterTime,120), Cast(DATEPART(hh, EnterTime)+DATEPART(mi, EnterTime)/5/100.00 as decimal(10,2))      

Select ApplicationId,AgentsID,Convert(Char(10),DateT,120) As Regdate,Cast(DATEPART(hh, DateT)+DATEPART(mi, DateT)/5/100.00 as decimal(10,2)) As HourMinute,Count(0) as Pay_Man,Sum(NeedMoney) As Pay_Money Into #Temp_Pay From  dbo.Count_PaymentInfo
       Where DateT>=@BeginDate and DateT<=@EndDate and  ApplicationId=@ApplicationId and AgentsID=@AgentsID
       Group By ApplicationId,AgentsID,Convert(Char(10),DateT,120), Cast(DATEPART(hh, DateT)+DATEPART(mi, DateT)/5/100.00 as decimal(10,2))      

select top 0 * from Auto_Minute_View union all
select A.ApplicationId,A.AgentsID As Client,A.Regdate,
DATEADD(mi,substring(CAST(A.HourMinute as nvarchar(50)),1,charindex('.',CAST(A.HourMinute as nvarchar(50)))-1)*60
+stuff(CAST(A.HourMinute as nvarchar(50)),1,charindex('.',CAST(A.HourMinute as nvarchar(50))),'')*5,A.Regdate) as hours,
 IsNull(A.Reg,0) As Reg,IsNull(A.Online,0) As Online,IsNull(B.Pay_Man,0) As Pay_Man,IsNull(B.Pay_Money,0) As Pay_Money from #Temp_Online A
       Left Outer Join #Temp_Pay B
            On A.ApplicationId=B.ApplicationId And A.AgentsID=B.AgentsID And A.Regdate=B.Regdate And A.HourMinute=B.HourMinute
  if(@BeginDate='')
begin
set @Msg='请输入日期'
end
else
begin
set @Msg='导出成功'
end






GO
