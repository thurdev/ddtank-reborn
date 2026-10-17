-- SQL_STORED_PROCEDURE dbo.ddt_Tank_Copy_Consortia_Sto (modified 2012-04-21T07:53:24.983)
-- Author:keny-- Date:2009-12-02  -- Description:Copy版公会查询
CREATE PROCEDURE [dbo].[ddt_Tank_Copy_Consortia_Sto]
@ConsortiaName nvarchar(200),
@Msg Varchar(50) OUTPUT
as
BEGIN
	Declare @ConsortiaID Int	 /*定义公会编号*/
	Set @ConsortiaID=0
	
	/*第一步：判断公会是否存在*/
	SELECT Top 1 @ConsortiaID=IsNull(ConsortiaID,0)
	FROM Db_tank_copy.dbo.Consortia
	WHERE ConsortiaName Like '%'+@ConsortiaName+'%'
	
	IF @ConsortiaID<1 
		Begin
			Set @Msg='未找到该公会'
			Return
		END
	 
	/*第二步：存在的情况下，取得公会的数据*/
	SELECT    ConsortiaID AS id, ConsortiaName, Honor, CreatorID, CreatorName, ChairmanID, ChairmanName, Description, Placard, [Level], MaxCount, CelebCount, 
	  BuildDate, Repute, Count, IP, Port, IsExist, Riches, DeductDate, WarnDate, LastDayRiches, AddDayRiches, LastWeekRiches, AddWeekRiches, 
	  LastDayHonor, AddDayHonor, LastWeekHonor, AddWeekHonor,StoreLevel,SmithLevel,ShopLevel
	FROM Db_tank_copy.dbo.Consortia where isExist=1 And ConsortiaName Like '%'+@ConsortiaName+'%'
	ORDER BY [Level] DESC,Riches DESC
	
	Set @Msg='查询信息成功'
END

GO
