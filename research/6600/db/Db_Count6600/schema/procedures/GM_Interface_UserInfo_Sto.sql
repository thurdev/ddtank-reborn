-- SQL_STORED_PROCEDURE dbo.GM_Interface_UserInfo_Sto (modified 2012-04-21T07:53:24.810)
/*--------Author:Jason  Description: YesWan 接口  Date:2009-12-29*/
CREATE      PROCEDURE GM_Interface_UserInfo_Sto
@NickName varchar(20),
@result int
as
if(@result=0)
begin
   select   A.UserID,A.UserName,A.PasswordTwo,A.NickName,A.[Date],A.IsConsortia,A.ConsortiaID,B.ConsortiaName,A.Win,A.Total,A.GP,
A.Honor,A.Gold,A.Money,A.Grade,A.State,A.IsFirst,A.Repute,A.LastDate,A.ChargeDate,A.ExpendDate,
A.ActiveIP,A.Offer,A.IsExist,A.LastDateSecond,A.LastDateThird,A.LoginCount,A.OnlineTime,A.IsMarried,
A.SpouseID,A.SpouseName,A.MarryInfoID,A.IsCreatedMarryRoom,A.SelfMarryRoomID,A.IsGotRing
 from Db_Tank.dbo.Sys_users_Detail as A
   left join Db_Tank.dbo.Consortia  as B on A.ConsortiaID=B.ConsortiaID
   where  NickName=@NickName
end
if(@result=1)
begin
   select   A.UserID,A.UserName,A.PasswordTwo,A.NickName,A.[Date],A.IsConsortia,A.ConsortiaID,B.ConsortiaName,A.Win,A.Total,A.GP,
A.Honor,A.Gold,A.Money,A.Grade,A.State,A.IsFirst,A.Repute,A.LastDate,A.ChargeDate,A.ExpendDate,
A.ActiveIP,A.Offer,A.IsExist,A.LastDateSecond,A.LastDateThird,A.LoginCount,A.OnlineTime,A.IsMarried,
A.SpouseID,A.SpouseName,A.MarryInfoID,A.IsCreatedMarryRoom,A.SelfMarryRoomID,A.IsGotRing
 from Db_Tank.dbo.Sys_users_Detail as A
   left join Db_Tank.dbo.Consortia  as B on A.ConsortiaID=B.ConsortiaID
   where  UserName=@NickName
end

GO
