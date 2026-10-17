-- SQL_STORED_PROCEDURE dbo.Count_AddHallofFame_Sto (modified 2012-04-21T07:53:24.577)

--Author:keny Date:2010-01-19 Description:添加名人堂数据
CREATE proc Count_AddHallofFame_Sto
@Name nvarchar(200), --名称
@Level nvarchar(20),  --等级
@Values nvarchar(20),  --值
@MainType int, --主类型
@MaxType int, --大类型
@MinType int, --子类型
@DateTime nvarchar(20) --日期
as

begin
insert db_count.dbo.Count_HallofFame values(@Name,@Level,@Values,@MainType,@MaxType,@MinType,@DateTime)
end
GO
