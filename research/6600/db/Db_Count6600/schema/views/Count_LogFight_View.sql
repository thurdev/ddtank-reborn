-- VIEW dbo.Count_LogFight_View (modified 2012-04-21T07:53:25.217)
--Author:keny  Date:2010-01-07 Description:查找玩家战斗记录
CREATE VIEW [dbo].[Count_LogFight_View]
AS
select Id,RoomId,
RoomType as RoomTypeId,
case RoomType
when '0' then '竞赛'
when '1' then '自由'
when '2' then '探险'
when '3' then 'Boos战'
when '4' then '夺宝'
end RoomType,
FightType as FightTypeId,
case FightType
when '0' then '自由战'
when '1' then '公会战'
when '2' then '训练'
when '4' then '不分类型'
when '5' then '探险'
when '6' then 'Boos战'
when '7' then '夺宝'
end FightType
,ChangeTeam,PlayBegin,PlayEnd,UserCount,MapId,TeamA,TeamB,PlayResult,
case WinTeam
when '1' then '队伍一'
when '2' then '队伍二'
end WinTeam
 from db_count.dbo.Log_Fight





GO
