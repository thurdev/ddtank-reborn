-- SQL_STORED_PROCEDURE dbo.Pay_Card_Create (modified 2012-04-21T07:54:31.077)





CREATE      PROCEDURE Pay_Card_Create
@row Integer,
@IsValues Integer,
@IsOpen Integer,
@MustMoney Numeric,
@GamePoint Integer,
@ApplicationId Varchar,
@BeginDay DateTime,
@EndDay DateTime,
@PayId Varchar(20)
AS
/*
插入随机数据
@row 设置生成记录数量
@IsValues 设置是否有效
@IsOpen 设置是否激活
@MustMoney 设置充值金额
@GamePoint 设置游戏点券
@ApplicationId 设置项目
@BeginDay 开始有效时间
@EndDay 结束有效时间
@PayId 冲值点生成单号
*/

SET NOCOUNT ON
WHILE @row >0
BEGIN
    -- 显示提示信息, 表示还需要插入多行数据
    RAISERROR('need %d rows', 10, 1, @row) WITH NOWAIT
     -- 插入随机的位编码数据
    SET ROWCOUNT @row
    INSERT Pay_Card(CardId,IsValues,IsOpen,MustMoney,GamePoint,BeginDay,EndDay,CardPassword,PayId,PayDateTime,ApplicationId) SELECT
        CardId = RIGHT(100000000 + CONVERT(bigint, ABS(CHECKSUM(NEWID()))), 8),
        IsValues=@IsValues,
        IsOpen=@IsOpen,
        MustMoney=@MustMoney,
        GamePoint=@GamePoint,
        BeginDay=@BeginDay,
        EndDay=@EndDay,
        CardPassword=RIGHT(100000000 + CONVERT(bigint, ABS(CHECKSUM(NEWID()))), 8),
        @PayId,
        GetDate(),
        @ApplicationId
    FROM syscolumns c1, syscolumns c2
    SET @row = @row - @@ROWCOUNT
END
  
-- 显示最终的结果记录是否正确
SELECT PayId, CardId,CardPassword,MustMoney,GamePoint,BeginDay,EndDay  FROM Pay_Card Where  PayId=@PayId

GO
