-- VIEW dbo.Ddt_Fight_Record_view (modified 2012-04-21T07:53:24.763)
CREATE  view [dbo].[Ddt_Fight_Record_view]
as
select  [ID],[PlayBegin],[PlayEnd],[ChangeTeam],
       A1=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=dbo.Get_StrArrayStrOfIndex(TeamA+',',',',1)),
       A2=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=dbo.Get_StrArrayStrOfIndex(TeamA+',',',',2)),
       A3=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=dbo.Get_StrArrayStrOfIndex(TeamA+',',',',3)),
       A4=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=dbo.Get_StrArrayStrOfIndex(TeamA+',',',',4)),
       B1=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=dbo.Get_StrArrayStrOfIndex(TeamB+',',',',1)),
       B2=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=dbo.Get_StrArrayStrOfIndex(TeamB+',',',',2)),
       B3=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=dbo.Get_StrArrayStrOfIndex(TeamB+',',',',3)),
       B4=(Select Top 1 NickName From  Db_Tank.Dbo.Sys_Users_Detail B Where  B.UserId=dbo.Get_StrArrayStrOfIndex(TeamB+',',',',4)),
       [MapID],[RoomType],[FightName],[WinTeam]
  From Db_Tank.Dbo.Fight_Record A



GO
