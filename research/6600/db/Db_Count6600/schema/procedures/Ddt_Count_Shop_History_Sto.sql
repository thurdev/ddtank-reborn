-- SQL_STORED_PROCEDURE dbo.Ddt_Count_Shop_History_Sto (modified 2012-04-21T07:53:24.450)

--查询用户消费记录
--作者:xiaov
--日期:2009-05-22
--描述：这是查询用户消费记录
--修改：watson
--修改日期：2009-11-07
--修改描述：当无指定用户名或昵称时能查到在该段时间的所有购买记录
--修改：keny
--修改日期：2009-11-18
--修改描述：设置默认查询条件为一天的时间段并用desc排序方法展示
CREATE PROCEDURE [dbo].[Ddt_Count_Shop_History_Sto] 
@Begin_Date DateTime, 
@End_Date DateTime,
@UserName Varchar(20),
@NickName Varchar(50)
AS
Declare @UserId Varchar(10)

/*查询出用户编号、用户昵称*/
If(@UserName!='')
   Select Top 1 @UserId=UserId,@NickName=NickName From Db_Tank.dbo.Sys_Users_Detail with(nolock) Where UserName=@UserName

/*查询出用户编号、用户名*/
If(@NickName!='')
begin
    Select Top 1 @UserId=UserId,@UserName=UserName From Db_Tank.dbo.Sys_Users_Detail with(nolock) Where NickName=@NickName

    /*统计用户购买记录*/
    Select A.Id,@UserName As UserName,@NickName As NickName,A.Money,A.EnterTime,B.Name,B.TemplateID,
           (len(A.goodid) - len(replace(A.goodid+',',Cast(B.TemplateID As Varchar(10))+',','')))/len(Cast(B.TemplateID As Varchar(10))) as counts
       From Count_Shop A ,Ddtc_Shop_Goods B
            Where CharIndex(','+Cast(B.TemplateID as Varchar(10))+',',','+A.goodid+',')>0  
				  And A.EnterTime>=@Begin_Date
				  And A.EnterTime<=@End_Date
                  And A.Money>0
                  And A.UserId=@UserId
end

if(@UserName='' and @NickName='')
begin

select  A.*,C.username,C.nickname into #temp from Count_Shop A left join db_tank_copy..sys_users_detail C on A.userid=C.userid 

/*统计用户购买记录*/
Select  A.Id,A.UserName,A.NickName,A.Money,A.EnterTime,B.Name,B.TemplateID,
           (len(A.goodid) - len(replace(A.goodid+',',Cast(B.TemplateID As Varchar(10))+',','')))/len(Cast(B.TemplateID As Varchar(10))) as counts
       From #temp A ,Ddtc_Shop_Goods B
            Where CharIndex(','+Cast(B.TemplateID as Varchar(10))+',',','+A.goodid+',')>0  			
                  And A.Money>0   and A.EnterTime between @Begin_Date
				  And @End_Date order by A.EnterTime desc

drop table #temp
end
GO
