-- SQL_STORED_PROCEDURE dbo.Sp_Count_Register_Info (modified 2012-04-21T07:53:25.123)
-- Author:	xiaov
-- ALTER  date: 2008.12.18
-- Description:	默认界面为今日注册当日注册量（分每小时计算），选择开始日期、结束日期即可以查询每天注册人数（可选分每小时计算）。输出为每日注册人数。（总计玩家需要在头部也显示一条）
CREATE  PROCEDURE  [dbo].[Sp_Count_Register_Info]
@ApplicationId Int,
@UserId Int
AS

Select Top 1 UserId,Sex,UserName,UserOther From Count_Register
    Where  ApplicationId=@ApplicationId 
           And UserId=@UserId

GO
