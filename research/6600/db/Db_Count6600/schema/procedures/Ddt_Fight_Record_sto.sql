-- SQL_STORED_PROCEDURE dbo.Ddt_Fight_Record_sto (modified 2012-04-21T07:53:24.640)
CREATE proc Ddt_Fight_Record_sto
-- Author:mike -- Date:2010-01-21  -- Description:导出频道战斗换装
@BeginTime datetime,
@EndTime datetime,
@Msg Varchar(50) OUTPUT
as
begin
select  [ID],[PlayBegin],[PlayEnd],[ChangeTeam],
       A1=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=Db_Count.dbo.Get_StrArrayStrOfIndex(TeamA+',',',',1)),
       A2=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=Db_Count.dbo.Get_StrArrayStrOfIndex(TeamA+',',',',2)),
       A3=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=Db_Count.dbo.Get_StrArrayStrOfIndex(TeamA+',',',',3)),
       A4=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=Db_Count.dbo.Get_StrArrayStrOfIndex(TeamA+',',',',4)),
       B1=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=Db_Count.dbo.Get_StrArrayStrOfIndex(TeamB+',',',',1)),
       B2=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=Db_Count.dbo.Get_StrArrayStrOfIndex(TeamB+',',',',2)),
       B3=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=Db_Count.dbo.Get_StrArrayStrOfIndex(TeamB+',',',',3)),
       B4=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=Db_Count.dbo.Get_StrArrayStrOfIndex(TeamB+',',',',4)),
       [MapID],[RoomType],[FightName],[WinTeam]
  From Db_Tank.Dbo.Fight_Record A  where PlayBegin>@BeginTime and PlayEnd<=@EndTime
end
if(@BeginTime='')
begin
set @Msg='请输入正确的日期'
end
else
begin
set @Msg='导出信息成功'
end

GO
